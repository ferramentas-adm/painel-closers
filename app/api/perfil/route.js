import { getPerfilPorNome, updatePerfilPorNome } from "@/lib/store";
import { readSessionName } from "@/lib/session";
import { perfilUpdateSchema } from "@/lib/schemas";

export async function GET(request) {
  const name = readSessionName(request);
  if (!name) {
    return Response.json({ error: "sessao invalida" }, { status: 401 });
  }
  const perfil = await getPerfilPorNome(name);
  return Response.json(perfil);
}

export async function PATCH(request) {
  const name = readSessionName(request);
  if (!name) {
    return Response.json({ error: "sessao invalida" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = perfilUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "dados invalidos";
    return Response.json({ error: message }, { status: 400 });
  }

  const result = await updatePerfilPorNome(name, parsed.data);
  if (!result) {
    return Response.json({ error: "email ja usado por outra conta" }, { status: 409 });
  }
  return Response.json(result);
}
