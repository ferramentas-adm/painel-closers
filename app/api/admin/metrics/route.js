import { getMetrics } from "@/lib/store";
import { isAdminRequest } from "@/lib/admin-session";

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "nao autorizado" }, { status: 401 });
  }
  const metrics = await getMetrics();
  return Response.json(metrics);
}
