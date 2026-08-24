import { createHmac, timingSafeEqual } from "crypto";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET nao configurado em producao. Defina uma variavel de ambiente forte antes de subir o servidor - sem ela, sessoes (inclusive de admin) usariam um segredo padrao publico no codigo."
  );
}

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

function sign(value) {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSignedCookie(cookieName, maxAgeSeconds) {
  return {
    create(payloadValue) {
      const payload = Buffer.from(payloadValue, "utf-8").toString("base64url");
      const token = `${payload}.${sign(payload)}`;
      return `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
    },
    clear() {
      return `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
    },
    read(request) {
      const cookie = request.headers.get("cookie") || "";
      const match = cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${cookieName}=`));
      if (!match) return null;

      const token = match.slice(cookieName.length + 1);
      const [payload, signature] = token.split(".");
      if (!payload || !signature) return null;

      const expected = sign(payload);
      const a = Buffer.from(signature, "hex");
      const b = Buffer.from(expected, "hex");
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

      return Buffer.from(payload, "base64url").toString("utf-8");
    },
  };
}
