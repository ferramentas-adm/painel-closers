"use client";

import { useEffect, useState } from "react";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "-";
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

const TABS = [
  ["colaboradores", "Colaboradores"],
  ["prioridade", "Prioridade"],
  ["metricas", "Metricas"],
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("colaboradores");
  const [colaboradores, setColaboradores] = useState([]);
  const [priorityText, setPriorityText] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.ok));
  }, []);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed]);

  async function loadAll() {
    const [cols, prio, mets] = await Promise.all([
      fetch("/api/admin/colaboradores").then((r) => r.json()),
      fetch("/api/priority").then((r) => r.json()),
      fetch("/api/admin/metrics").then((r) => r.json()),
    ]);
    setColaboradores(cols);
    setPriorityText(prio.join("\n"));
    setMetrics(mets);
  }

  async function login() {
    setLoginError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error ?? "erro");
      return;
    }
    setPassword("");
    setAuthed(true);
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
  }

  async function salvarColaborador(c) {
    setMsg("");
    const res = await fetch("/api/admin/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, mesa: c.mesa, email: c.email }),
    });
    if (res.ok) {
      setMsg(`${c.nome} salvo.`);
      loadAll();
    }
  }

  async function resetarSenha(c) {
    const nova = prompt(`Nova senha para ${c.nome}:`);
    if (!nova) return;
    const res = await fetch("/api/admin/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, novaSenha: nova }),
    });
    if (res.ok) setMsg(`Senha de ${c.nome} redefinida.`);
  }

  async function excluir(c) {
    if (!confirm(`Excluir ${c.nome} permanentemente? Essa acao nao pode ser desfeita.`)) return;
    const res = await fetch("/api/admin/colaboradores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id }),
    });
    if (res.ok) {
      setMsg(`${c.nome} excluido.`);
      loadAll();
    }
  }

  async function salvarPrioridade() {
    const names = priorityText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    const res = await fetch("/api/priority", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });
    if (res.ok) setMsg("Lista de prioridade salva.");
  }

  function updateField(id, field, value) {
    setColaboradores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  if (authed === null) {
    return (
      <main className="min-h-screen bg-[#0a0b0d] text-white flex items-center justify-center">
        <p className="text-neutral-600 text-sm">Carregando...</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#0a0b0d] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-800 text-2xl">
              🔐
            </div>
            <h1 className="text-xl font-bold">Admin</h1>
            <p className="text-neutral-500 text-sm mt-1">Gestao do painel de closers</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-6 flex flex-col gap-4">
            <input
              className="rounded-xl px-4 py-3 bg-neutral-900 text-white border border-neutral-800 text-base focus:outline-none focus:border-neutral-600"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Senha de admin"
              autoFocus
            />
            {loginError && (
              <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">
                {loginError}
              </p>
            )}
            <button
              onClick={login}
              className="bg-blue-600 hover:bg-blue-500 rounded-xl py-3 text-base font-semibold transition-colors"
            >
              Entrar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0b0d] text-white px-6 py-8 sm:px-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
            <p className="text-neutral-500 text-sm mt-0.5">Gestao do painel de closers</p>
          </div>
          <button
            onClick={logout}
            className="text-neutral-500 hover:text-red-400 text-xs font-medium transition-colors"
          >
            sair
          </button>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-neutral-950 border border-neutral-900 mb-8">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === key
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && (
          <p className="text-emerald-400 text-sm mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 inline-block">
            {msg}
          </p>
        )}

        {tab === "colaboradores" && (
          <div className="flex flex-col gap-3">
            {colaboradores.map((c) => (
              <div
                key={c.id}
                className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 flex flex-wrap items-center gap-3"
              >
                <div className="min-w-[160px]">
                  <p className="font-semibold">{c.nome}</p>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      c.status === "livre"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : c.status === "ocupado"
                        ? "bg-rose-500/15 text-rose-400"
                        : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {c.status ?? "fora do painel"}
                  </span>
                </div>
                <input
                  className="rounded-lg px-3 py-2 bg-neutral-900 border border-neutral-800 w-20 text-sm focus:outline-none focus:border-neutral-600"
                  value={c.mesa ?? ""}
                  onChange={(e) => updateField(c.id, "mesa", e.target.value)}
                  placeholder="mesa"
                />
                <input
                  className="rounded-lg px-3 py-2 bg-neutral-900 border border-neutral-800 flex-1 min-w-[180px] text-sm focus:outline-none focus:border-neutral-600"
                  value={c.email ?? ""}
                  onChange={(e) => updateField(c.id, "email", e.target.value)}
                  placeholder="email"
                />
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => salvarColaborador(c)}
                    className="bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => resetarSenha(c)}
                    className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    Redefinir senha
                  </button>
                  <button
                    onClick={() => excluir(c)}
                    className="bg-red-950 border border-red-900 hover:border-red-700 text-red-400 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
            {colaboradores.length === 0 && (
              <p className="text-neutral-600 text-sm">Nenhum colaborador cadastrado.</p>
            )}
          </div>
        )}

        {tab === "prioridade" && (
          <div className="flex flex-col gap-4 max-w-md">
            <p className="text-neutral-500 text-sm">
              Um nome (ou trecho de nome) por linha. A comparacao ignora
              maiusculas e acentos.
            </p>
            <textarea
              className="rounded-xl px-4 py-3 bg-neutral-950 border border-neutral-900 h-64 font-mono text-sm focus:outline-none focus:border-neutral-600"
              value={priorityText}
              onChange={(e) => setPriorityText(e.target.value)}
            />
            <button
              onClick={salvarPrioridade}
              className="bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-semibold transition-colors"
            >
              Salvar prioridade
            </button>
          </div>
        )}

        {tab === "metricas" && metrics && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-3">
                Geral
              </h2>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                {metrics.geral.map((g) => (
                  <div
                    key={g.status}
                    className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4"
                  >
                    <p
                      className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${
                        g.status === "livre" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {g.status}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatDuration(g.mediaMs)}
                    </p>
                    <p className="text-neutral-600 text-xs mt-1">
                      media por periodo · {g.periodos} periodos
                    </p>
                  </div>
                ))}
                {metrics.geral.length === 0 && (
                  <p className="text-neutral-600 text-sm col-span-2">
                    Sem historico ainda.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-3">
                Por colaborador
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-neutral-900">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-900 bg-neutral-950">
                      <th className="py-3 px-4 font-medium">Nome</th>
                      <th className="py-3 px-4 font-medium">Media ocupado</th>
                      <th className="py-3 px-4 font-medium">Total ocupado</th>
                      <th className="py-3 px-4 font-medium">Media livre</th>
                      <th className="py-3 px-4 font-medium">Total livre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.porColaborador.map((c) => (
                      <tr key={c.nome} className="border-b border-neutral-900 last:border-0">
                        <td className="py-3 px-4 font-semibold">{c.nome}</td>
                        <td className="py-3 px-4 tabular-nums">{formatDuration(c.ocupado.mediaMs)}</td>
                        <td className="py-3 px-4 tabular-nums">{formatDuration(c.ocupado.totalMs)}</td>
                        <td className="py-3 px-4 tabular-nums">{formatDuration(c.livre.mediaMs)}</td>
                        <td className="py-3 px-4 tabular-nums">{formatDuration(c.livre.totalMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {metrics.porColaborador.length === 0 && (
                  <p className="text-neutral-600 text-sm p-4">
                    Sem historico ainda — as metricas se acumulam a medida que os
                    closers trocam de status.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
