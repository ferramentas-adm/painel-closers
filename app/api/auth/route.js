import { createAccount, verifyLogin } from "@/lib/store";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { getFullNameFromDirectory } from "@/lib/google-calendar";
import { authSchema } from "@/lib/schemas";

function nomeFromEmail(email) {
  const prefixo = email.split("@")[0];
  return prefixo
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1))
    .join(" ");
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "dados invalidos";
    return Response.json({ error: message }, { status: 400 });
  }
  const { action, email, password, mesa } = parsed.data;

  if (action === "register") {
    const nome = (await getFullNameFromDirectory(email)) || nomeFromEmail(email);
    const account = await createAccount(password, mesa, email, nome);
    if (!account) {
      return Response.json({ error: "email ja cadastrado" }, { status: 409 });
    }
    return Response.json(
      { name: account.displayName },
      { headers: { "Set-Cookie": createSessionCookie(account.displayName) } }
    );
  }

  const account = await verifyLogin(email, password);
  if (!account) {
    return Response.json({ error: "email ou senha invalidos" }, { status: 401 });
  }
  return Response.json(
    { name: account.displayName },
    { headers: { "Set-Cookie": createSessionCookie(account.displayName) } }
  );
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
