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

// Fecha o periodo atual de status (se houver) e grava no historico, pra dar
// base as metricas de tempo medio livre/ocupado.
function closeCurrentPeriod(colaboradorId, status, inicio, fim) {
  if (!status || !inicio || fim <= inicio) return;
  db.prepare(
    "INSERT INTO historico_status (colaborador_id, status, inicio, fim) VALUES (?, ?, ?, ?)"
  ).run(colaboradorId, status, inicio, fim);
}

export async function getAll() {
  const rows = db
    .prepare(
      "SELECT nome, status, status_alterado_em, mesa, alerta_ti FROM colaboradores WHERE status IS NOT NULL"
    )
    .all();
  const result = {};
  for (const row of rows) {
    result[row.nome] = {
      status: row.status,
      changedAt: row.status_alterado_em,
      mesa: row.mesa,
      alertaTi: row.alerta_ti,
    };
  }
  return result;
}

export async function setStatus(name, status) {
  const changedAt = Date.now();
  const current = db
    .prepare("SELECT id, status, status_alterado_em FROM colaboradores WHERE chave = ?")
    .get(keyFor(name));
  if (current) {
    closeCurrentPeriod(current.id, current.status, current.status_alterado_em, changedAt);
  }
  db.prepare(
    "UPDATE colaboradores SET status = ?, status_alterado_em = ? WHERE chave = ?"
  ).run(status, changedAt, keyFor(name));
  return { status, changedAt };
}

export async function removeCloser(name) {
  const now = Date.now();
  const current = db
    .prepare("SELECT id, status, status_alterado_em FROM colaboradores WHERE chave = ?")
    .get(keyFor(name));
  if (current) {
    closeCurrentPeriod(current.id, current.status, current.status_alterado_em, now);
  }
  db.prepare(
    "UPDATE colaboradores SET status = NULL, status_alterado_em = NULL, alerta_ti = NULL, sync_pausado = 1 WHERE chave = ?"
  ).run(keyFor(name));
}

export async function clearAll() {
  const now = Date.now();
  const abertos = db
    .prepare("SELECT id, status, status_alterado_em FROM colaboradores WHERE status IS NOT NULL")
    .all();
  for (const row of abertos) {
    closeCurrentPeriod(row.id, row.status, row.status_alterado_em, now);
  }
  db.prepare(
    "UPDATE colaboradores SET status = NULL, status_alterado_em = NULL, alerta_ti = NULL, sync_pausado = 1"
  ).run();
}

export async function registrarHeartbeat(name) {
  db.prepare("UPDATE colaboradores SET ultimo_heartbeat = ? WHERE chave = ?").run(
    Date.now(),
    keyFor(name)
  );
}

// Closers no painel (status setado, sync ativo) cujo navegador parou de
// responder ha mais de `limiteMs` - provavelmente fecharam a aba ou perderam
// a sessao sem clicar em "sair".
export async function getNomesInativos(limiteMs) {
  const corte = Date.now() - limiteMs;
  const rows = db
    .prepare(
      `SELECT nome FROM colaboradores
       WHERE status IS NOT NULL
         AND sync_pausado = 0
         AND (ultimo_heartbeat IS NULL OR ultimo_heartbeat < ?)`
    )
    .all(corte);
  return rows.map((r) => r.nome);
}

export async function createAccount(password, mesa, email, nome) {
  const emailNormalizado = email.trim().toLowerCase();
  const existingEmail = db
    .prepare("SELECT id FROM colaboradores WHERE lower(email) = ?")
    .get(emailNormalizado);
  if (existingEmail) return null;

  const displayName = nome.trim();
  const chave = keyFor(displayName);
  const existingChave = db.prepare("SELECT id FROM colaboradores WHERE chave = ?").get(chave);
  if (existingChave) return null;

  db.prepare(
    "INSERT INTO colaboradores (chave, nome, senha_hash, mesa, email, criado_em) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(chave, displayName, hashPassword(password), mesa.trim(), email.trim(), Date.now());
  return { displayName };
}

export async function verifyLogin(email, password) {
  const row = db
    .prepare("SELECT nome, senha_hash FROM colaboradores WHERE lower(email) = ?")
    .get(email.trim().toLowerCase());
  if (!row) return null;
  if (!verifyPassword(password, row.senha_hash)) return null;
  db.prepare("UPDATE colaboradores SET sync_pausado = 0 WHERE nome = ?").run(row.nome);
  return { displayName: row.nome };
}

export async function setAlertaTi(name, active) {
  db.prepare("UPDATE colaboradores SET alerta_ti = ? WHERE chave = ?").run(
    active ? Date.now() : null,
    keyFor(name)
  );
}

export async function clearAlertaTiByDisplayName(displayName) {
  db.prepare("UPDATE colaboradores SET alerta_ti = NULL WHERE nome = ?").run(displayName);
}

export async function getEmailByName(name) {
  const row = db.prepare("SELECT email FROM colaboradores WHERE nome = ?").get(name);
  return row?.email || null;
}

export async function getPerfilPorNome(name) {
  return db.prepare("SELECT mesa, email FROM colaboradores WHERE nome = ?").get(name) ?? null;
}

// Atualiza mesa/email do proprio closer (identificado pela sessao). Retorna
// null se o email ja pertence a outra conta.
export async function updatePerfilPorNome(name, { mesa, email }) {
  const emailNormalizado = email.trim().toLowerCase();
  const outraConta = db
    .prepare("SELECT id FROM colaboradores WHERE lower(email) = ? AND nome != ?")
    .get(emailNormalizado, name);
  if (outraConta) return null;

  db.prepare("UPDATE colaboradores SET mesa = ?, email = ? WHERE nome = ?").run(
    mesa.trim(),
    email.trim(),
    name
  );
  return { mesa: mesa.trim(), email: email.trim() };
}

export async function getColaboradoresComEmail() {
  return db
    .prepare(
      "SELECT nome, email FROM colaboradores WHERE email IS NOT NULL AND email != '' AND sync_pausado = 0"
    )
    .all();
}

// So grava se o status mudou, pra nao resetar o "ha quanto tempo" a cada sync.
// Ignorado se o closer foi removido manualmente do painel (sync_pausado) - so
// volta a ser sincronizado quando ele logar de novo.
export async function applyAutoStatus(nome, status) {
  const changedAt = Date.now();
  const current = db
    .prepare("SELECT id, status, status_alterado_em, sync_pausado FROM colaboradores WHERE nome = ?")
    .get(nome);
  if (!current || current.sync_pausado || current.status === status) return;
  closeCurrentPeriod(current.id, current.status, current.status_alterado_em, changedAt);
  db.prepare("UPDATE colaboradores SET status = ?, status_alterado_em = ? WHERE nome = ?").run(
    status,
    changedAt,
    nome
  );
}

// --- Admin ---

export async function getColaboradoresAdmin() {
  return db
    .prepare(
      "SELECT id, nome, mesa, email, status, status_alterado_em AS changedAt, criado_em AS criadoEm FROM colaboradores ORDER BY nome"
    )
    .all();
}

export async function updateColaborador(id, { mesa, email }) {
  db.prepare("UPDATE colaboradores SET mesa = ?, email = ? WHERE id = ?").run(
    mesa?.trim() || null,
    email?.trim() || null,
    id
  );
}

export async function resetSenha(id, novaSenha) {
  db.prepare("UPDATE colaboradores SET senha_hash = ? WHERE id = ?").run(
    hashPassword(novaSenha),
    id
  );
}

export async function deleteColaborador(id) {
  db.prepare("DELETE FROM historico_status WHERE colaborador_id = ?").run(id);
  db.prepare("DELETE FROM colaboradores WHERE id = ?").run(id);
}

export async function getMetrics() {
  const porStatus = db
    .prepare(
      `SELECT c.nome AS nome, h.status AS status,
              COUNT(*) AS periodos,
              AVG(h.fim - h.inicio) AS mediaMs,
              SUM(h.fim - h.inicio) AS totalMs
       FROM historico_status h
       JOIN colaboradores c ON c.id = h.colaborador_id
       GROUP BY c.id, h.status`
    )
    .all();

  const porColaborador = {};
  for (const row of porStatus) {
    if (!porColaborador[row.nome]) {
      porColaborador[row.nome] = {
        nome: row.nome,
        ocupado: { periodos: 0, mediaMs: 0, totalMs: 0 },
        livre: { periodos: 0, mediaMs: 0, totalMs: 0 },
      };
    }
    if (row.status === "ocupado" || row.status === "livre") {
      porColaborador[row.nome][row.status] = {
        periodos: row.periodos,
        mediaMs: row.mediaMs,
        totalMs: row.totalMs,
      };
    }
  }

  const geral = db
    .prepare(
      `SELECT status, COUNT(*) AS periodos, AVG(fim - inicio) AS mediaMs, SUM(fim - inicio) AS totalMs
       FROM historico_status
       GROUP BY status`
    )
    .all();

  return {
    porColaborador: Object.values(porColaborador),
    geral,
  };
}
