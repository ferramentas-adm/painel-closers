import { getColaboradoresComEmail, applyAutoStatus } from "@/lib/store";
import { getBusyEmailsNow, googleCalendarConfigured } from "@/lib/google-calendar";

const SYNC_INTERVAL_MS = 60_000;

async function syncOnce() {
  const colaboradores = await getColaboradoresComEmail();
  if (colaboradores.length === 0) return;

  const busyEmails = await getBusyEmailsNow(colaboradores.map((c) => c.email));
  for (const { nome, email } of colaboradores) {
    await applyAutoStatus(nome, busyEmails.has(email) ? "ocupado" : "livre");
  }
}

export function startCalendarSync() {
  if (!googleCalendarConfigured) {
    console.log("Google Calendar nao configurado - sync automatico desativado.");
    return;
  }
  console.log("Sync automatico de agenda Google iniciado.");
  syncOnce().catch((err) => console.error("Erro no sync de agenda:", err));
  setInterval(() => {
    syncOnce().catch((err) => console.error("Erro no sync de agenda:", err));
  }, SYNC_INTERVAL_MS);
}
