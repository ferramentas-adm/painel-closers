"use client";

import { useEffect, useRef, useState } from "react";

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
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center">
            {mode === "login" ? "Entrar" : "Criar cadastro"}
          </h1>
          <input
            className="rounded-lg px-4 py-3 bg-neutral-800 text-white placeholder-neutral-500 border border-neutral-700 text-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            autoFocus
          />
          <input
            className="rounded-lg px-4 py-3 bg-neutral-800 text-white placeholder-neutral-500 border border-neutral-700 text-lg"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAuth()}
            placeholder="Senha"
          />
          {mode === "register" && (
            <input
              className="rounded-lg px-4 py-3 bg-neutral-800 text-white placeholder-neutral-500 border border-neutral-700 text-lg"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAuth()}
              placeholder="Numero da mesa"
            />
          )}
          {mode === "register" && (
            <input
              className="rounded-lg px-4 py-3 bg-neutral-800 text-white placeholder-neutral-500 border border-neutral-700 text-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAuth()}
              placeholder="Email do Google Workspace (opcional, sincroniza a agenda)"
            />
          )}
          {authError && (
            <p className="text-red-500 text-sm text-center">{authError}</p>
          )}
          <button
            disabled={loading}
            onClick={submitAuth}
            className="bg-blue-600 hover:bg-blue-500 rounded-lg py-3 text-lg font-semibold"
          >
            {mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setAuthError("");
            }}
            className="text-neutral-500 text-sm underline"
          >
            {mode === "login" ? "criar cadastro" : "ja tenho cadastro"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-3xl font-bold">Ola, {name}</h1>
      <p className="text-neutral-400">
        Status atual:{" "}
        <span className="font-semibold">
          {status === "livre" ? "Livre" : status === "ocupado" ? "Ocupado" : "-"}
        </span>
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          disabled={loading}
          onClick={() => update("livre")}
          className={`rounded-2xl py-6 text-2xl font-bold ${
            status === "livre"
              ? "bg-green-500 text-black"
              : "bg-neutral-800 hover:bg-green-900"
          }`}
        >
          LIVRE
        </button>
        <button
          disabled={loading}
          onClick={() => update("ocupado")}
          className={`rounded-2xl py-6 text-2xl font-bold ${
            status === "ocupado"
              ? "bg-red-500 text-black"
              : "bg-neutral-800 hover:bg-red-900"
          }`}
        >
          OCUPADO
        </button>
        <button
          onClick={toggleAlerta}
          className={`rounded-2xl py-6 text-2xl font-bold ${
            alertaAtiva
              ? "bg-orange-500 text-black animate-pulse"
              : "bg-neutral-800 hover:bg-orange-900"
          }`}
        >
          {alertaAtiva ? "🆘 T.I. A CAMINHO - CANCELAR" : "🆘 CHAMAR T.I."}
        </button>
      </div>

      <div className="flex gap-6">
        <button onClick={sairSessao} className="text-neutral-500 text-sm underline">
          sair da conta
        </button>
        <button
          disabled={loading}
          onClick={sair}
          className="text-red-500 text-sm underline"
        >
          sair (remover do painel)
        </button>
      </div>
    </main>
  );
}
