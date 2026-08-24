import { createAdminSessionCookie, clearAdminSessionCookie, isAdminRequest } from "@/lib/admin-session";
import { adminLoginSchema } from "@/lib/schemas";
import { checkRateLimit, registrarFalha, limparTentativas } from "@/lib/rate-limit";
import { timingSafeEqual } from "crypto";

const RATE_LIMIT_KEY = "admin-login";

function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return Response.json(
      { error: "ADMIN_PASSWORD nao configurado no servidor" },
      { status: 500 }
    );
  }

  const limite = checkRateLimit(RATE_LIMIT_KEY);
  if (limite.bloqueado) {
    return Response.json(
      { error: "muitas tentativas, aguarde alguns minutos" },
      { status: 429 }
    );
  }

  if (!checkPassword(parsed.data.password)) {
    registrarFalha(RATE_LIMIT_KEY);
    return Response.json({ error: "senha invalida" }, { status: 401 });
  }
  limparTentativas(RATE_LIMIT_KEY);

  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": createAdminSessionCookie() } }
  );
}

export async function GET(request) {
  return Response.json({ ok: isAdminRequest(request) });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearAdminSessionCookie() } });
}
