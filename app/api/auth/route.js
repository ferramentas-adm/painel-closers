import { createAccount, verifyLogin } from "@/lib/store";

export async function POST(request) {
  const { action, name, password } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "nome obrigatorio" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return Response.json({ error: "senha obrigatoria" }, { status: 400 });
  }

  if (action === "register") {
    const account = await createAccount(name, password);
    if (!account) {
      return Response.json({ error: "nome ja cadastrado" }, { status: 409 });
    }
    return Response.json({ name: account.displayName });
  }

  if (action === "login") {
    const account = await verifyLogin(name, password);
    if (!account) {
      return Response.json({ error: "nome ou senha invalidos" }, { status: 401 });
    }
    return Response.json({ name: account.displayName });
  }

  return Response.json({ error: "acao invalida" }, { status: 400 });
}
