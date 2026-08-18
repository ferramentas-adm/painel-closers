import { getNomesInativos, removeCloser } from "@/lib/store";

const SWEEP_INTERVAL_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 15_000;

async function sweepOnce() {
  const inativos = await getNomesInativos(HEARTBEAT_TIMEOUT_MS);
  for (const nome of inativos) {
    await removeCloser(nome);
  }
}

export function startHeartbeatSweep() {
  console.log("Varredura de inatividade iniciada.");
  sweepOnce().catch((err) => console.error("Erro na varredura de inatividade:", err));
  setInterval(() => {
    sweepOnce().catch((err) => console.error("Erro na varredura de inatividade:", err));
  }, SWEEP_INTERVAL_MS);
}
