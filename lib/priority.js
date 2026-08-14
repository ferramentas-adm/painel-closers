import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const PRIORITY_FILE = path.join(DATA_DIR, "priority.json");

const DEFAULT_PRIORITY_NAMES = [
  "geraldo",
  "roni",
  "leandro",
  "neto",
  "ferro",
  "joao leme",
  "lucas santos",
  "igor occon",
  "arthur",
];

export async function getPriorityNames() {
  try {
    const raw = await readFile(PRIORITY_FILE, "utf-8");
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
  } catch {
    // arquivo ainda nao existe - usa o padrao
  }
  return DEFAULT_PRIORITY_NAMES;
}

export async function setPriorityNames(names) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PRIORITY_FILE, JSON.stringify(names, null, 2), "utf-8");
}
