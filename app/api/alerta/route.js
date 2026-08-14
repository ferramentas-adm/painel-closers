import { setAlertaTi, clearAlertaTiByDisplayName } from "@/lib/store";
import { readSessionName } from "@/lib/session";
import { alertaSchema, alertaClearSchema } from "@/lib/schemas";

export async function POST(request) {
  const name = readSessionName(request);
  if (!name) {
    return Response.json({ error: "sessao invalida, faca login novamente" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = alertaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  await setAlertaTi(name, parsed.data.active);
  return Response.json({ ok: true });
}

// Resolver alerta pelo proprio painel (sem login, mesmo padrao do "limpar tudo").
export async function DELETE(request) {
  const body = await request.json().catch(() => null);
  const parsed = alertaClearSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  await clearAlertaTiByDisplayName(parsed.data.name);
  return Response.json({ ok: true });
}
