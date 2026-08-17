import { setAlertaTi, clearAlertaTiByDisplayName } from "@/lib/store";
import { readSessionName } from "@/lib/session";
import { isAdminRequest } from "@/lib/admin-session";
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

export async function DELETE(request) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "nao autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = alertaClearSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  await clearAlertaTiByDisplayName(parsed.data.name);
  return Response.json({ ok: true });
}
