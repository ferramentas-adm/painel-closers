import { Redis } from "@upstash/redis";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

const hasRedis = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

const redis = hasRedis
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

// Sem Redis (VPS com instancia unica): persiste em arquivo JSON local.
// Escritas sao serializadas por fila para nao corromper o arquivo em concorrencia.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

function createHashStore(hashKey, fileName) {
  const dataFile = path.join(DATA_DIR, fileName);
  let writeQueue = Promise.resolve();

  async function readFileStore() {
    try {
      const raw = await readFile(dataFile, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  async function writeFileStore(data) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(dataFile, JSON.stringify(data, null, 2), "utf-8");
  }

  function queueWrite(mutator) {
    writeQueue = writeQueue.then(async () => {
      const data = await readFileStore();
      const result = mutator(data);
      await writeFileStore(data);
      return result;
    });
    return writeQueue;
  }

  return {
    async getAll() {
      if (redis) {
        const data = await redis.hgetall(hashKey);
        if (!data) return {};
        const parsed = {};
        for (const [key, value] of Object.entries(data)) {
          parsed[key] = typeof value === "string" ? JSON.parse(value) : value;
        }
        return parsed;
      }
      return readFileStore();
    },
    async get(key) {
      if (redis) {
        const value = await redis.hget(hashKey, key);
        if (!value) return null;
        return typeof value === "string" ? JSON.parse(value) : value;
      }
      const data = await readFileStore();
      return data[key] ?? null;
    },
    async set(key, entry) {
      if (redis) {
        await redis.hset(hashKey, { [key]: JSON.stringify(entry) });
        return entry;
      }
      return queueWrite((data) => {
        data[key] = entry;
        return entry;
      });
    },
    async remove(key) {
      if (redis) {
        await redis.hdel(hashKey, key);
        return;
      }
      await queueWrite((data) => {
        delete data[key];
      });
    },
    async clear() {
      if (redis) {
        await redis.del(hashKey);
        return;
      }
      await queueWrite((data) => {
        for (const k of Object.keys(data)) delete data[k];
      });
    },
  };
}

const closersStore = createHashStore("closers", "closers.json");

export async function getAll() {
  return closersStore.getAll();
}

export async function setStatus(name, status) {
  const entry = { status, changedAt: Date.now() };
  await closersStore.set(name, entry);
  return entry;
}

export async function removeCloser(name) {
  await closersStore.remove(name);
}

export async function clearAll() {
  await closersStore.clear();
}

const accountsStore = createHashStore("closer_accounts", "accounts.json");

export async function createAccount(name, password) {
  const key = name.trim().toLowerCase();
  const existing = await accountsStore.get(key);
  if (existing) return null;
  const entry = {
    displayName: name.trim(),
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  await accountsStore.set(key, entry);
  return entry;
}

export async function verifyLogin(name, password) {
  const account = await accountsStore.get(name.trim().toLowerCase());
  if (!account) return null;
  if (!verifyPassword(password, account.passwordHash)) return null;
  return account;
}
