import { createSignedCookie } from "@/lib/signed-cookie";

const MAX_AGE_SECONDS = 60 * 60 * 12;
const cookie = createSignedCookie("admin_session", MAX_AGE_SECONDS);

export function createAdminSessionCookie() {
  return cookie.create("admin");
}

export function clearAdminSessionCookie() {
  return cookie.clear();
}

export function isAdminRequest(request) {
  return cookie.read(request) === "admin";
}
