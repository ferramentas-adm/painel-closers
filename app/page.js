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

  const accent = alerta
    ? "border-orange-500/70 bg-orange-500/[0.07]"
    : priority && livre
    ? "border-amber-400/70 bg-amber-400/[0.06]"
    : livre
    ? "border-emerald-500/50 bg-emerald-500/[0.05]"
    : "border-rose-500/50 bg-rose-500/[0.05]";

  return (
    <div
      className={`relative rounded-2xl border ${accent} p-5 flex flex-col items-center gap-2 transition-colors ${
        alerta || (priority && livre) ? "animate-soft-pulse" : ""
      }`}
    >
      {info.mesa && (
        <span className="absolute top-3 right-4 text-[11px] font-medium text-neutral-500 tabular-nums">
          mesa {info.mesa}
        </span>
      )}

      <span className="text-xl font-semibold text-center leading-tight pr-2">
        {priority && <span className="mr-1">💎</span>}
        {name}
      </span>

      <span
        className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
          livre
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-rose-500/15 text-rose-400"
        }`}
      >
        {livre ? "Livre" : "Ocupado"}
      </span>

      <span className="text-white text-3xl font-bold tabular-nums mt-1">
        {formatElapsed(now - info.changedAt)}
      </span>

      {alerta && (
        <span className="text-orange-400 font-semibold text-xs mt-1">
          🆘 chamou T.I.
        </span>
      )}
    </div>
  );
}

function Grid({ items, now, priorityNames }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map(([name, info]) => (
        <Card key={name} name={name} info={info} now={now} priorityNames={priorityNames} />
      ))}
    </div>
  );
}

function SectionHeader({ label, count, color }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
        {label}
      </h2>
      <span className="text-xs font-semibold text-neutral-600 bg-neutral-900 border border-neutral-800 rounded-full px-2 py-0.5">
        {count}
      </span>
      <div className="flex-1 h-px bg-neutral-900" />
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
    const res = await fetch("/api/status", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (res.status === 401) {
      alert("Precisa estar logado como admin. Acesse /admin.");
      return;
    }
    setClosers({});
  }

  async function resolverAlerta(name) {
    const res = await fetch("/api/alerta", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.status === 401) {
      alert("Precisa estar logado como admin. Acesse /admin.");
      return;
    }
    setClosers((prev) => ({
      ...prev,
      [name]: { ...prev[name], alertaTi: null },
    }));
  }

  return (
    <main className="min-h-screen bg-[#0a0b0d] text-white px-6 py-8 sm:px-10">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel de Status</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Atualiza automaticamente a cada poucos segundos
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={limparTudo}
            className="text-neutral-500 hover:text-red-400 text-xs font-medium transition-colors"
          >
            limpar tudo
          </button>
        )}
      </header>

      {alertas.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8 flex flex-col gap-2">
          {alertas.map(([name, info]) => (
            <div
              key={name}
              className="bg-orange-500/10 border border-orange-500/40 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-lg">
                  🆘
                </span>
                <span className="font-semibold text-orange-100">
                  {name}
                  {info.mesa ? ` · mesa ${info.mesa}` : ""}
                  <span className="text-orange-300/80 font-normal"> precisa de T.I.</span>
                </span>
              </div>
              <button
                onClick={() => resolverAlerta(name)}
                className="bg-orange-500 hover:bg-orange-400 text-black rounded-lg px-4 py-2 text-sm font-semibold transition-colors shrink-0"
              >
                Resolvido
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="max-w-6xl mx-auto text-center py-24">
          <p className="text-5xl mb-4">🗒️</p>
          <p className="text-neutral-400 text-lg">Nenhum closer cadastrado ainda.</p>
          <p className="text-neutral-600 text-sm mt-1">
            Acesse <span className="text-neutral-400">/closer</span> para adicionar.
          </p>
        </div>
      ) : cycling ? (
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            label={showingLivres ? "Livres" : "Ocupados"}
            count={showingLivres ? livres.length : ocupados.length}
            color={showingLivres ? "bg-emerald-500" : "bg-rose-500"}
          />
          <Grid items={showingLivres ? livres : ocupados} now={now} priorityNames={priorityNames} />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div>
            <SectionHeader label="Livres" count={livres.length} color="bg-emerald-500" />
            <Grid items={livres} now={now} priorityNames={priorityNames} />
          </div>
          <div>
            <SectionHeader label="Ocupados" count={ocupados.length} color="bg-rose-500" />
            <Grid items={ocupados} now={now} priorityNames={priorityNames} />
          </div>
        </div>
      )}

      <a
        href="/admin"
        className="fixed bottom-3 right-4 text-neutral-800 hover:text-neutral-600 text-[11px] transition-colors"
      >
        admin
      </a>
    </main>
  );
}
