import {
  getColaboradoresAdmin,
  updateColaborador,
  deleteColaborador,
  resetSenha,
} from "@/lib/store";
import { isAdminRequest } from "@/lib/admin-session";
import { colaboradorUpdateSchema, colaboradorDeleteSchema, resetSenhaSchema } from "@/lib/schemas";

function requireAdmin(request) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "nao autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const colaboradores = await getColaboradoresAdmin();
  return Response.json(colaboradores);
}

export async function PATCH(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);

  if (body?.novaSenha !== undefined) {
    const parsed = resetSenhaSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "dados invalidos" }, { status: 400 });
    }
    await resetSenha(parsed.data.id, parsed.data.novaSenha);
    return Response.json({ ok: true });
  }

  const parsed = colaboradorUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }
  const ok = await updateColaborador(parsed.data.id, parsed.data);
  if (!ok) {
    return Response.json({ error: "email ja usado por outro colaborador" }, { status: 409 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = colaboradorDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }
  await deleteColaborador(parsed.data.id);
  return Response.json({ ok: true });
}
