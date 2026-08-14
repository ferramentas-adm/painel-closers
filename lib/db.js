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

const columns = db.prepare("PRAGMA table_info(colaboradores)").all().map((c) => c.name);
if (!columns.includes("mesa")) {
  db.exec("ALTER TABLE colaboradores ADD COLUMN mesa TEXT");
}
if (!columns.includes("alerta_ti")) {
  db.exec("ALTER TABLE colaboradores ADD COLUMN alerta_ti INTEGER");
}

export default db;
