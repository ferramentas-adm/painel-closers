import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const COOKIE_NAME = "closer_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.warn(
    "SESSION_SECRET nao configurado em producao - defina uma variavel de ambiente forte."
  );
}

function sign(value) {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSessionCookie(name) {
  const payload = Buffer.from(name, "utf-8").toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export function readSessionName(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;

  const token = match.slice(COOKIE_NAME.length + 1);
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return Buffer.from(payload, "base64url").toString("utf-8");
}
