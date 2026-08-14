import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

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

export default db;
