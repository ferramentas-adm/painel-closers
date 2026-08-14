import { getAll, setStatus, removeCloser, clearAll } from "@/lib/store";

export async function GET() {
  const all = await getAll();
  return Response.json(all);
}

export async function POST(request) {
  const { name, status } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name obrigatorio" }, { status: 400 });
  }
  if (status !== "livre" && status !== "ocupado") {
    return Response.json({ error: "status invalido" }, { status: 400 });
  }

  const entry = await setStatus(name.trim(), status);
  return Response.json({ name: name.trim(), ...entry });
}

export async function DELETE(request) {
  const { name, all } = await request.json();
  if (all) {
    await clearAll();
    return Response.json({ ok: true });
  }
  if (!name) {
    return Response.json({ error: "name obrigatorio" }, { status: 400 });
  }
  await removeCloser(name);
  return Response.json({ ok: true });
}
