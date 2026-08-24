import { createSignedCookie } from "@/lib/signed-cookie";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const cookie = createSignedCookie("closer_session", MAX_AGE_SECONDS);

export function createSessionCookie(name) {
  return cookie.create(name);
}

export function clearSessionCookie() {
  return cookie.clear();
}

export function readSessionName(request) {
  return cookie.read(request);
}
