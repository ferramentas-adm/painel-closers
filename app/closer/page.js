"use client";

import { useEffect, useRef, useState } from "react";

function Field({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <input
        className="rounded-xl px-4 py-3 bg-neutral-900 text-white placeholder-neutral-600 border border-neutral-800 text-base focus:outline-none focus:border-neutral-600 transition-colors"
        {...props}
      />
    </label>
  );
}

export default function CloserControl() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [mesa, setMesa] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState(null);
  const [alertaAtiva, setAlertaAtiva] = useState(false);
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(false);
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
    if (!name.trim() || !password) return;
    if (mode === "register") {
      if (!name.trim().includes(" ")) {
        setAuthError("digite nome e sobrenome");
        return;
      }
      if (!mesa.trim()) {
        setAuthError("informe o numero da mesa");
        return;
      }
    }
    setAuthError("");
    setLoading(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode, name, password, mesa, email }),
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
      <main className="min-h-screen bg-[#0a0b0d] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-2xl">
              👤
            </div>
            <h1 className="text-xl font-bold">
              {mode === "login" ? "Entrar" : "Criar cadastro"}
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Painel de status dos closers
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-6 flex flex-col gap-4">
            <Field
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Joao Silva"
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
            {mode === "register" && (
              <Field
                label="Numero da mesa"
                value={mesa}
                onChange={(e) => setMesa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAuth()}
                placeholder="Ex: 12"
              />
            )}
            {mode === "register" && (
              <Field
                label="Email do Google Workspace (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAuth()}
                placeholder="voce@empresa.com"
              />
            )}

            {authError && (
              <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">
                {authError}
              </p>
            )}

            <button
              disabled={loading}
              onClick={submitAuth}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-3 text-base font-semibold transition-colors"
            >
              {mode === "login" ? "Entrar" : "Cadastrar"}
            </button>
          </div>

          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setAuthError("");
            }}
            className="w-full text-center text-neutral-500 hover:text-neutral-300 text-sm mt-5 transition-colors"
          >
            {mode === "login" ? "Ainda nao tenho cadastro" : "Ja tenho cadastro"}
          </button>
        </div>
      </main>
    );
  }

  const livre = status === "livre";

  return (
    <main className="min-h-screen bg-[#0a0b0d] text-white flex flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-xs text-center">
        <h1 className="text-2xl font-bold">Ola, {name}</h1>
        <span
          className={`inline-block mt-2 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
            status
              ? livre
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-rose-500/15 text-rose-400"
              : "bg-neutral-800 text-neutral-500"
          }`}
        >
          {livre ? "Livre" : status === "ocupado" ? "Ocupado" : "Sem status"}
        </span>
      </div>

      {evento && (
        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 w-full max-w-xs text-sm">
          <p className="font-semibold text-white mb-1">{evento.titulo}</p>
          <p className="text-neutral-500">
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
            <p className="text-neutral-500 mt-1">
              com {evento.participantes.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          disabled={loading}
          onClick={() => update("livre")}
          className={`rounded-2xl py-5 text-xl font-bold transition-colors disabled:opacity-50 ${
            status === "livre"
              ? "bg-emerald-500 text-black"
              : "bg-neutral-900 border border-neutral-800 hover:border-emerald-600/50"
          }`}
        >
          Livre
        </button>
        <button
          disabled={loading}
          onClick={() => update("ocupado")}
          className={`rounded-2xl py-5 text-xl font-bold transition-colors disabled:opacity-50 ${
            status === "ocupado"
              ? "bg-rose-500 text-black"
              : "bg-neutral-900 border border-neutral-800 hover:border-rose-600/50"
          }`}
        >
          Ocupado
        </button>
        <button
          onClick={toggleAlerta}
          className={`rounded-2xl py-4 text-base font-semibold transition-colors ${
            alertaAtiva
              ? "bg-orange-500 text-black animate-soft-pulse"
              : "bg-neutral-900 border border-neutral-800 hover:border-orange-600/50 text-orange-400"
          }`}
        >
          {alertaAtiva ? "🆘 T.I. a caminho — cancelar" : "🆘 Chamar T.I."}
        </button>
      </div>

      <div className="flex gap-6 mt-2">
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
