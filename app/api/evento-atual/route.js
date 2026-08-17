import { getEmailByName } from "@/lib/store";
import { getCurrentEvent } from "@/lib/google-calendar";
import { readSessionName } from "@/lib/session";

export async function GET(request) {
  const name = readSessionName(request);
  if (!name) {
    return Response.json({ error: "sessao invalida" }, { status: 401 });
  }

  const email = await getEmailByName(name);
  if (!email) {
    return Response.json({ evento: null });
  }

  const evento = await getCurrentEvent(email);
  return Response.json({ evento });
}
