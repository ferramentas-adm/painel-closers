import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import db from "@/lib/db";

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

function keyFor(name) {
  return name.trim().toLowerCase();
}

export async function getAll() {
  const rows = db
    .prepare(
      "SELECT nome, status, status_alterado_em FROM colaboradores WHERE status IS NOT NULL"
    )
    .all();
  const result = {};
  for (const row of rows) {
    result[row.nome] = { status: row.status, changedAt: row.status_alterado_em };
  }
  return result;
}

export async function setStatus(name, status) {
  const changedAt = Date.now();
  db.prepare(
    "UPDATE colaboradores SET status = ?, status_alterado_em = ? WHERE chave = ?"
  ).run(status, changedAt, keyFor(name));
  return { status, changedAt };
}

export async function removeCloser(name) {
  db.prepare(
    "UPDATE colaboradores SET status = NULL, status_alterado_em = NULL WHERE chave = ?"
  ).run(keyFor(name));
}

export async function clearAll() {
  db.prepare(
    "UPDATE colaboradores SET status = NULL, status_alterado_em = NULL"
  ).run();
}

export async function createAccount(name, password) {
  const chave = keyFor(name);
  const existing = db
    .prepare("SELECT id FROM colaboradores WHERE chave = ?")
    .get(chave);
  if (existing) return null;

  const displayName = name.trim();
  db.prepare(
    "INSERT INTO colaboradores (chave, nome, senha_hash, criado_em) VALUES (?, ?, ?, ?)"
  ).run(chave, displayName, hashPassword(password), Date.now());
  return { displayName };
}

export async function verifyLogin(name, password) {
  const row = db
    .prepare("SELECT nome, senha_hash FROM colaboradores WHERE chave = ?")
    .get(keyFor(name));
  if (!row) return null;
  if (!verifyPassword(password, row.senha_hash)) return null;
  return { displayName: row.nome };
}
