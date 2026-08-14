"use client";

import { useEffect, useState } from "react";

const CYCLE_THRESHOLD = 8;
const CYCLE_INTERVAL = 8000;

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function isPriority(name, priorityNames) {
  const n = normalize(name);
  return priorityNames.some((p) => n.includes(p));
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function Card({ name, info, now, priorityNames }) {
  const livre = info.status === "livre";
  const priority = isPriority(name, priorityNames);
  const alerta = !!info.alertaTi;
  return (
    <div
      className={`rounded-2xl p-6 shadow-lg border-4 flex flex-col items-center gap-2 ${
        alerta
          ? "bg-orange-950 border-orange-400 animate-pulse"
          : priority
          ? livre
            ? "bg-yellow-900 border-yellow-400 animate-pulse"
            : "bg-yellow-900 border-yellow-400"
          : livre
          ? "bg-green-950 border-green-500"
          : "bg-red-950 border-red-500"
      }`}
    >
      <span className="text-2xl font-semibold text-center">
        {priority ? "💎 " : ""}
        {name}
      </span>
      {info.mesa && (
        <span className="text-neutral-400 text-sm">mesa {info.mesa}</span>
      )}
      <span
        className={`text-lg font-bold uppercase tracking-wide ${
          livre ? "text-green-400" : "text-red-400"
        }`}
      >
        {livre ? "Livre" : "Ocupado"}
      </span>
      <span className="text-neutral-100 text-2xl font-bold tabular-nums">
        {formatElapsed(now - info.changedAt)}
      </span>
      {alerta && (
        <span className="text-orange-400 font-bold text-sm">🆘 CHAMOU T.I.</span>
      )}
    </div>
  );
}

function Grid({ items, now, priorityNames }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {items.map(([name, info]) => (
        <Card key={name} name={name} info={info} now={now} priorityNames={priorityNames} />
      ))}
    </div>
  );
}

export default function Painel() {
  const [closers, setClosers] = useState({});
  const [now, setNow] = useState(Date.now());
  const [cycleIndex, setCycleIndex] = useState(0);
  const [priorityNames, setPriorityNames] = useState([]);

  useEffect(() => {
    fetch("/api/priority")
      .then((r) => r.json())
      .then(setPriorityNames);
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      setClosers(data);
    }
    load();
    const poll = setInterval(load, 3000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const cycle = setInterval(() => setCycleIndex((i) => 1 - i), CYCLE_INTERVAL);
    return () => clearInterval(cycle);
  }, []);

  const entries = Object.entries(closers);
  const byLongestWaiting = ([, a], [, b]) => a.changedAt - b.changedAt;
  const livres = entries.filter(([, info]) => info.status === "livre").sort(byLongestWaiting);
  const ocupados = entries.filter(([, info]) => info.status === "ocupado").sort(byLongestWaiting);

  const cycling = entries.length > CYCLE_THRESHOLD;
  const showingLivres = !cycling || cycleIndex === 0;

  const alertas = entries.filter(([, info]) => info.alertaTi);

  async function limparTudo() {
    if (!confirm("Remover todos os closers do painel?")) return;
    await fetch("/api/status", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setClosers({});
  }

  async function resolverAlerta(name) {
    await fetch("/api/alerta", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setClosers((prev) => ({
      ...prev,
      [name]: { ...prev[name], alertaTi: null },
    }));
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-2 tracking-tight">
        Painel de Status
      </h1>

      {alertas.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8 flex flex-col gap-2">
          {alertas.map(([name, info]) => (
            <div
              key={name}
              className="bg-orange-600 text-black rounded-xl px-6 py-4 flex items-center justify-between animate-pulse"
            >
              <span className="font-bold text-lg">
                🆘 {name}
                {info.mesa ? ` (mesa ${info.mesa})` : ""} precisa de T.I.
              </span>
              <button
                onClick={() => resolverAlerta(name)}
                className="bg-black text-white rounded-lg px-4 py-2 font-semibold"
              >
                Resolvido
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="text-center mb-8">
          <button
            onClick={limparTudo}
            className="text-red-500 text-sm underline"
          >
            limpar tudo
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-center text-neutral-400 text-xl">
          Nenhum closer cadastrado ainda. Acesse /closer para adicionar.
        </p>
      ) : cycling ? (
        <div className="max-w-6xl mx-auto">
          <h2
            className={`text-2xl font-bold mb-4 uppercase tracking-wide ${
              showingLivres ? "text-green-400" : "text-red-400"
            }`}
          >
            {showingLivres ? `Livres (${livres.length})` : `Ocupados (${ocupados.length})`}
          </h2>
          <Grid items={showingLivres ? livres : ocupados} now={now} priorityNames={priorityNames} />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <div>
            <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide text-green-400">
              Livres ({livres.length})
            </h2>
            <Grid items={livres} now={now} priorityNames={priorityNames} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide text-red-400">
              Ocupados ({ocupados.length})
            </h2>
            <Grid items={ocupados} now={now} priorityNames={priorityNames} />
          </div>
        </div>
      )}
    </main>
  );
}
