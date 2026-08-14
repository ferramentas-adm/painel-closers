import { createAccount, verifyLogin } from "@/lib/store";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { authSchema } from "@/lib/schemas";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }
  const { action, name, password, mesa } = parsed.data;

  if (action === "register") {
    const account = await createAccount(name, password, mesa);
    if (!account) {
      return Response.json({ error: "nome ja cadastrado" }, { status: 409 });
    }
    return Response.json(
      { name: account.displayName },
      { headers: { "Set-Cookie": createSessionCookie(account.displayName) } }
    );
  }

  const account = await verifyLogin(name, password);
  if (!account) {
    return Response.json({ error: "nome ou senha invalidos" }, { status: 401 });
  }
  return Response.json(
    { name: account.displayName },
    { headers: { "Set-Cookie": createSessionCookie(account.displayName) } }
  );
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
