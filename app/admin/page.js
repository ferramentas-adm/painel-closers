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

export default function AdminPage() {
  const [authed, setAuthed] = useState(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("colaboradores");
  const [colaboradores, setColaboradores] = useState([]);
  const [priorityNames, setPriorityNames] = useState([]);
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
    setPriorityNames(prio);
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
    if (res.ok) {
      setMsg("Lista de prioridade salva.");
      setPriorityNames(names);
    }
  }

  function updateField(id, field, value) {
    setColaboradores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  if (authed === null) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p className="text-neutral-400">Carregando...</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center">Admin</h1>
          <input
            className="rounded-lg px-4 py-3 bg-neutral-800 text-white border border-neutral-700 text-lg"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Senha de admin"
            autoFocus
          />
          {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          <button
            onClick={login}
            className="bg-blue-600 hover:bg-blue-500 rounded-lg py-3 text-lg font-semibold"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin</h1>
          <button onClick={logout} className="text-neutral-500 text-sm underline">
            sair
          </button>
        </div>

        <div className="flex gap-6 mb-6 border-b border-neutral-800">
          {[
            ["colaboradores", "Colaboradores"],
            ["prioridade", "Prioridade"],
            ["metricas", "Metricas"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 px-1 font-semibold ${
                tab === key
                  ? "border-b-2 border-blue-500 text-white"
                  : "text-neutral-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && <p className="text-green-400 text-sm mb-4">{msg}</p>}

        {tab === "colaboradores" && (
          <div className="flex flex-col gap-3">
            {colaboradores.map((c) => (
              <div
                key={c.id}
                className="bg-neutral-900 rounded-xl p-4 flex flex-wrap items-center gap-3"
              >
                <span className="font-semibold min-w-[180px]">{c.nome}</span>
                <input
                  className="rounded-lg px-3 py-2 bg-neutral-800 border border-neutral-700 w-24"
                  value={c.mesa ?? ""}
                  onChange={(e) => updateField(c.id, "mesa", e.target.value)}
                  placeholder="mesa"
                />
                <input
                  className="rounded-lg px-3 py-2 bg-neutral-800 border border-neutral-700 flex-1 min-w-[200px]"
                  value={c.email ?? ""}
                  onChange={(e) => updateField(c.id, "email", e.target.value)}
                  placeholder="email"
                />
                <span className="text-sm text-neutral-400 min-w-[80px]">
                  {c.status ?? "fora"}
                </span>
                <button
                  onClick={() => salvarColaborador(c)}
                  className="bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  Salvar
                </button>
                <button
                  onClick={() => resetarSenha(c)}
                  className="bg-neutral-700 hover:bg-neutral-600 rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  Redefinir senha
                </button>
                <button
                  onClick={() => excluir(c)}
                  className="bg-red-900 hover:bg-red-800 rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  Excluir
                </button>
              </div>
            ))}
            {colaboradores.length === 0 && (
              <p className="text-neutral-500">Nenhum colaborador cadastrado.</p>
            )}
          </div>
        )}

        {tab === "prioridade" && (
          <div className="flex flex-col gap-4 max-w-md">
            <p className="text-neutral-400 text-sm">
              Um nome (ou trecho de nome) por linha. Comparacao ignora
              maiusculas/acentos.
            </p>
            <textarea
              className="rounded-lg px-4 py-3 bg-neutral-800 border border-neutral-700 h-64 font-mono text-sm"
              value={priorityText}
              onChange={(e) => setPriorityText(e.target.value)}
            />
            <button
              onClick={salvarPrioridade}
              className="bg-blue-600 hover:bg-blue-500 rounded-lg py-3 font-semibold"
            >
              Salvar prioridade
            </button>
          </div>
        )}

        {tab === "metricas" && metrics && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold mb-3">Geral</h2>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                {metrics.geral.map((g) => (
                  <div key={g.status} className="bg-neutral-900 rounded-xl p-4">
                    <p className="text-neutral-400 text-sm uppercase">{g.status}</p>
                    <p className="text-2xl font-bold">{formatDuration(g.mediaMs)}</p>
                    <p className="text-neutral-500 text-xs">
                      media por periodo ({g.periodos} periodos)
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Por colaborador</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-400 border-b border-neutral-800">
                      <th className="py-2 pr-4">Nome</th>
                      <th className="py-2 pr-4">Media ocupado</th>
                      <th className="py-2 pr-4">Total ocupado</th>
                      <th className="py-2 pr-4">Media livre</th>
                      <th className="py-2 pr-4">Total livre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.porColaborador.map((c) => (
                      <tr key={c.nome} className="border-b border-neutral-900">
                        <td className="py-2 pr-4 font-semibold">{c.nome}</td>
                        <td className="py-2 pr-4">{formatDuration(c.ocupado.mediaMs)}</td>
                        <td className="py-2 pr-4">{formatDuration(c.ocupado.totalMs)}</td>
                        <td className="py-2 pr-4">{formatDuration(c.livre.mediaMs)}</td>
                        <td className="py-2 pr-4">{formatDuration(c.livre.totalMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {metrics.porColaborador.length === 0 && (
                  <p className="text-neutral-500 mt-4">
                    Sem historico ainda - as metricas se acumulam a medida que os
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
