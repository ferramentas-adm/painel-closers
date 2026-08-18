import { getAll, setStatus, removeCloser, clearAll, registrarHeartbeat } from "@/lib/store";
import { readSessionName } from "@/lib/session";
import { isAdminRequest } from "@/lib/admin-session";
import { statusUpdateSchema, statusDeleteSchema } from "@/lib/schemas";

export async function GET(request) {
  const name = readSessionName(request);
  if (name) {
    await registrarHeartbeat(name);
  }
  const all = await getAll();
  return Response.json(all);
}

export async function POST(request) {
  const name = readSessionName(request);
  if (!name) {
    return Response.json({ error: "sessao invalida, faca login novamente" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "status invalido" }, { status: 400 });
  }

  const entry = await setStatus(name, parsed.data.status);
  return Response.json({ name, ...entry });
}

export async function DELETE(request) {
  const body = await request.json().catch(() => null);
  const parsed = statusDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  if (parsed.data.all) {
    if (!isAdminRequest(request)) {
      return Response.json({ error: "nao autorizado" }, { status: 401 });
    }
    await clearAll();
    return Response.json({ ok: true });
  }

  const name = readSessionName(request);
  if (!name) {
    return Response.json({ error: "sessao invalida, faca login novamente" }, { status: 401 });
  }
  await removeCloser(name);
  return Response.json({ ok: true });
}
