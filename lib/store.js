import { Redis } from "@upstash/redis";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const HASH_KEY = "closers";

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
const DATA_FILE = path.join(DATA_DIR, "closers.json");
let writeQueue = Promise.resolve();

async function readFileStore() {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeFileStore(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
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

export async function getAll() {
  if (redis) {
    const data = await redis.hgetall(HASH_KEY);
    if (!data) return {};
    const parsed = {};
    for (const [name, value] of Object.entries(data)) {
      parsed[name] = typeof value === "string" ? JSON.parse(value) : value;
    }
    return parsed;
  }
  return readFileStore();
}

export async function setStatus(name, status) {
  const entry = { status, changedAt: Date.now() };
  if (redis) {
    await redis.hset(HASH_KEY, { [name]: JSON.stringify(entry) });
    return entry;
  }
  return queueWrite((data) => {
    data[name] = entry;
    return entry;
  });
}

export async function removeCloser(name) {
  if (redis) {
    await redis.hdel(HASH_KEY, name);
    return;
  }
  await queueWrite((data) => {
    delete data[name];
  });
}

export async function clearAll() {
  if (redis) {
    await redis.del(HASH_KEY);
    return;
  }
  await queueWrite((data) => {
    for (const key of Object.keys(data)) delete data[key];
  });
}
