import { getPriorityNames, setPriorityNames } from "@/lib/priority";
import { isAdminRequest } from "@/lib/admin-session";
import { priorityUpdateSchema } from "@/lib/schemas";

export async function GET() {
  const names = await getPriorityNames();
  return Response.json(names);
}

export async function PUT(request) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "nao autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = priorityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }
  await setPriorityNames(parsed.data.names);
  return Response.json({ ok: true });
}
