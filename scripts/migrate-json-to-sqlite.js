const { readFileSync, existsSync } = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const db = new Database(path.join(DATA_DIR, "painel.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS colaboradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    status TEXT,
    status_alterado_em INTEGER,
    criado_em INTEGER NOT NULL
  )
`);

function readJson(fileName) {
  const file = path.join(DATA_DIR, fileName);
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf-8"));
}

const accounts = readJson("accounts.json");
const closers = readJson("closers.json");

const insert = db.prepare(
  "INSERT OR IGNORE INTO colaboradores (chave, nome, senha_hash, status, status_alterado_em, criado_em) VALUES (?, ?, ?, ?, ?, ?)"
);

let migrated = 0;
for (const [chave, account] of Object.entries(accounts)) {
  const closerEntry = closers[account.displayName];
  insert.run(
    chave,
    account.displayName,
    account.passwordHash,
    closerEntry?.status ?? null,
    closerEntry?.changedAt ?? null,
    account.createdAt ?? Date.now()
  );
  migrated++;
}

console.log(`Migrados ${migrated} colaboradores de accounts.json/closers.json para painel.db`);
