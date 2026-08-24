import { createAccount, verifyLogin } from "@/lib/store";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { authSchema } from "@/lib/schemas";
import { checkRateLimit, registrarFalha, limparTentativas } from "@/lib/rate-limit";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "dados invalidos";
    return Response.json({ error: message }, { status: 400 });
  }
  const { action, email, password, mesa, name } = parsed.data;
  const rateLimitKey = `${action}:${email.trim().toLowerCase()}`;

  const limite = checkRateLimit(rateLimitKey);
  if (limite.bloqueado) {
    return Response.json(
      { error: "muitas tentativas, aguarde alguns minutos" },
      { status: 429 }
    );
  }

  if (action === "register") {
    const resultado = await createAccount(password, mesa, email, name);
    if (resultado.erro === "email") {
      return Response.json({ error: "email ja cadastrado" }, { status: 409 });
    }
    if (resultado.erro === "nome") {
      return Response.json({ error: "nome ja cadastrado" }, { status: 409 });
    }
    return Response.json(
      { name: resultado.displayName },
      { headers: { "Set-Cookie": createSessionCookie(resultado.displayName) } }
    );
  }

  const account = await verifyLogin(email, password);
  if (!account) {
    registrarFalha(rateLimitKey);
    return Response.json({ error: "email ou senha invalidos" }, { status: 401 });
  }
  limparTentativas(rateLimitKey);
  return Response.json(
    { name: account.displayName },
    { headers: { "Set-Cookie": createSessionCookie(account.displayName) } }
  );
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
