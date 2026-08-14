import { getAll, setStatus, removeCloser, clearAll } from "@/lib/store";
import { readSessionName } from "@/lib/session";
import { statusUpdateSchema, statusDeleteSchema } from "@/lib/schemas";

export async function GET() {
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
