import { getPriorityNames } from "@/lib/priority";

export async function GET() {
  const names = await getPriorityNames();
  return Response.json(names);
}
