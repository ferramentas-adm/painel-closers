"use client";

import { useEffect, useRef, useState } from "react";

function Field({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-600">
        {label}
      </span>
      <input
        className="rounded-lg px-4 py-3 bg-white/[0.03] text-white placeholder-neutral-700 border border-white/[0.08] text-base focus:outline-none focus:border-cyan-500/50 transition-colors"
        {...props}
      />
    </label>
  );
}

export default function CloserControl() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mesa, setMesa] = useState("");
  const [mode, setMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState(null);
  const [alertaAtiva, setAlertaAtiva] = useState(false);
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [perfilMesa, setPerfilMesa] = useState("");
  const [perfilEmail, setPerfilEmail] = useState("");
  const [perfilErro, setPerfilErro] = useState("");
  const [perfilMsg, setPerfilMsg] = useState("");
  const registeredRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("closerName");
    if (stored) {
      setName(stored);
      setSaved(true);
    }
  }, []);

  useEffect(() => {
    if (!saved || !name) return;
    registeredRef.current = false;
    async function poll() {
      const data = await fetch("/api/status", { cache: "no-store" }).then((r) => r.json());
      if (!data[name]) {
        if (registeredRef.current) {
          localStorage.removeItem("closerName");
          setSaved(false);
          setStatus(null);
        }
        return;
      }
      registeredRef.current = true;
      setStatus(data[name].status);
      setAlertaAtiva(!!data[name].alertaTi);
    }
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [saved, name]);

  useEffect(() => {
    if (!saved) return;
    async function poll() {
      const data = await fetch("/api/evento-atual", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ evento: null }));
      setEvento(data.evento ?? null);
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [saved]);

  async function submitAuth() {
    if (!email.trim() || !password) return;
    if (mode === "register" && !mesa.trim()) {
      setAuthError("informe o numero da mesa");
      return;
    }
    setAuthError("");
    setLoading(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode, email, password, mesa }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setAuthError(data.error ?? "erro");
      return;
    }
    localStorage.setItem("closerName", data.name);
    setName(data.name);
    setPassword("");
    setSaved(true);
  }

  async function update(newStatus) {
    setLoading(true);
    const res = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.status === 401) {
      sairSessao();
      setLoading(false);
      return;
    }
    setStatus(newStatus);
    setLoading(false);
  }

  async function abrirPerfil() {
    if (perfilAberto) {
      setPerfilAberto(false);
      return;
    }
    setPerfilErro("");
    setPerfilMsg("");
    const perfil = await fetch("/api/perfil", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    setPerfilMesa(perfil?.mesa ?? "");
    setPerfilEmail(perfil?.email ?? "");
    setPerfilAberto(true);
  }

  async function salvarPerfil() {
    setPerfilErro("");
    setPerfilMsg("");
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesa: perfilMesa, email: perfilEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPerfilErro(data.error ?? "erro");
      return;
    }
    setPerfilMsg("Perfil atualizado.");
  }

  async function toggleAlerta() {
    const active = !alertaAtiva;
    setAlertaAtiva(active);
    await fetch("/api/alerta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  }

  async function sairSessao() {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    localStorage.removeItem("closerName");
    setSaved(false);
    setStatus(null);
    setPassword("");
  }

  async function sair() {
    setLoading(true);
    await fetch("/api/status", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await sairSessao();
    setLoading(false);
  }

  if (!saved) {
    return (
      <main className="board-texture min-h-screen bg-[#0a0b0d] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xl font-bold">
              ◆
            </div>
            <h1 className="font-mono text-lg font-bold uppercase tracking-widest">
              {mode === "login" ? "Entrar" : "Cadastro"}
            </h1>
            <p className="text-neutral-600 text-sm mt-1">
              Painel de status dos closers
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 flex flex-col gap-4">
            {mode === "register" && (
              <Field
                label="Numero da mesa"
                value={mesa}
                onChange={(e) => setMesa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAuth()}
                placeholder="Ex: 12"
              />
            )}
            <Field
              label="Email do Google Workspace"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAuth()}
              placeholder="voce@empresa.com"
              autoFocus
            />
            <Field
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAuth()}
              placeholder="••••••"
            />

            {authError && (
              <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">
                {authError}
              </p>
            )}

            <button
              disabled={loading}
              onClick={submitAuth}
              className="bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-50 rounded-lg py-3 text-sm font-bold uppercase tracking-wide transition-colors"
            >
              {mode === "login" ? "Entrar" : "Cadastrar"}
            </button>
          </div>

          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setAuthError("");
            }}
            className="w-full text-center text-neutral-600 hover:text-neutral-400 text-sm mt-5 transition-colors"
          >
            {mode === "login" ? "Ainda nao tenho cadastro" : "Ja tenho cadastro"}
          </button>
        </div>
      </main>
    );
  }

  const livre = status === "livre";

  return (
    <main className="board-texture min-h-screen bg-[#0a0b0d] text-white flex flex-col items-center justify-center gap-5 p-6">
      <div className="w-full max-w-xs text-center">
        <h1 className="text-xl font-bold">{name}</h1>
        <span
          className={`inline-block mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em] ${
            status
              ? livre
                ? "text-emerald-400"
                : "text-rose-400"
              : "text-neutral-600"
          }`}
        >
          [{livre ? "LIVRE" : status === "ocupado" ? "OCUPADO" : "SEM STATUS"}]
        </span>
      </div>

      {evento && (
        <div className="relative overflow-hidden bg-white/[0.02] border border-white/[0.06] rounded-lg pl-4 pr-4 py-3 w-full max-w-xs text-sm">
          <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500/60" />
          <p className="font-semibold text-white mb-1">{evento.titulo}</p>
          <p className="font-mono text-neutral-500 text-xs">
            {new Date(evento.inicio).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" – "}
            {new Date(evento.fim).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {evento.participantes.length > 0 && (
            <p className="text-neutral-500 mt-1 text-xs">
              com {evento.participantes.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          disabled={loading}
          onClick={() => update("livre")}
          className={`rounded-lg py-4 text-lg font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
            status === "livre"
              ? "bg-emerald-500 text-black"
              : "bg-white/[0.02] border border-white/[0.08] hover:border-emerald-600/50"
          }`}
        >
          Livre
        </button>
        <button
          disabled={loading}
          onClick={() => update("ocupado")}
          className={`rounded-lg py-4 text-lg font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
            status === "ocupado"
              ? "bg-rose-500 text-black"
              : "bg-white/[0.02] border border-white/[0.08] hover:border-rose-600/50"
          }`}
        >
          Ocupado
        </button>
        <button
          onClick={toggleAlerta}
          className={`rounded-lg py-3.5 text-sm font-bold uppercase tracking-wide transition-colors ${
            alertaAtiva
              ? "bg-orange-500 text-black animate-soft-pulse"
              : "bg-white/[0.02] border border-white/[0.08] hover:border-orange-600/50 text-orange-400"
          }`}
        >
          {alertaAtiva ? "▲ T.I. a caminho — cancelar" : "▲ Chamar T.I."}
        </button>
      </div>

      {perfilAberto && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 w-full max-w-xs flex flex-col gap-3">
          <Field
            label="Numero da mesa"
            value={perfilMesa}
            onChange={(e) => setPerfilMesa(e.target.value)}
            placeholder="Ex: 12"
          />
          <Field
            label="Email do Google Workspace"
            type="email"
            value={perfilEmail}
            onChange={(e) => setPerfilEmail(e.target.value)}
            placeholder="voce@ogruposilva.com.br"
          />
          {perfilErro && (
            <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">
              {perfilErro}
            </p>
          )}
          {perfilMsg && (
            <p className="text-emerald-400 text-xs text-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2">
              {perfilMsg}
            </p>
          )}
          <button
            onClick={salvarPerfil}
            className="bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg py-2.5 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Salvar perfil
          </button>
        </div>
      )}

      <div className="flex gap-6 mt-1">
        <button onClick={abrirPerfil} className="text-neutral-600 hover:text-neutral-400 text-xs transition-colors">
          {perfilAberto ? "fechar perfil" : "editar perfil"}
        </button>
        <button onClick={sairSessao} className="text-neutral-600 hover:text-neutral-400 text-xs transition-colors">
          sair da conta
        </button>
        <button
          disabled={loading}
          onClick={sair}
          className="text-neutral-600 hover:text-red-400 text-xs transition-colors"
        >
          remover do painel
        </button>
      </div>
    </main>
  );
}
