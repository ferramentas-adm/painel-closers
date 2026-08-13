"use client";

import { useEffect, useState } from "react";

export default function CloserControl() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("closerName");
    if (stored) {
      setName(stored);
      setSaved(true);
    }
  }, []);

  useEffect(() => {
    if (!saved || !name) return;
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => setStatus(data[name]?.status ?? null));
  }, [saved, name]);

  function confirmName() {
    if (!name.trim()) return;
    localStorage.setItem("closerName", name.trim());
    setSaved(true);
  }

  async function update(newStatus) {
    setLoading(true);
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, status: newStatus }),
    });
    setStatus(newStatus);
    setLoading(false);
  }

  function trocarNome() {
    localStorage.removeItem("closerName");
    setSaved(false);
    setStatus(null);
  }

  async function sair() {
    setLoading(true);
    await fetch("/api/status", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    localStorage.removeItem("closerName");
    setSaved(false);
    setStatus(null);
    setLoading(false);
  }

  if (!saved) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center">Qual seu nome?</h1>
          <input
            className="rounded-lg px-4 py-3 bg-neutral-800 text-white placeholder-neutral-500 border border-neutral-700 text-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmName()}
            placeholder="Ex: Joao"
            autoFocus
          />
          <button
            onClick={confirmName}
            className="bg-blue-600 hover:bg-blue-500 rounded-lg py-3 text-lg font-semibold"
          >
            Continuar
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
      </div>

      <div className="flex gap-6">
        <button onClick={trocarNome} className="text-neutral-500 text-sm underline">
          trocar nome
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
