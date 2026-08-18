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
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function formatClock(date) {
  return date.toLocaleTimeString("pt-BR", { hour12: false });
}

function Card({ name, info, now, priorityNames }) {
  const livre = info.status === "livre";
  const priority = isPriority(name, priorityNames);
  const alerta = !!info.alertaTi;

  const stripColor = alerta
    ? "bg-orange-500"
    : priority && livre
    ? "bg-amber-400"
    : livre
    ? "bg-emerald-500"
    : "bg-rose-500";

  const labelColor = alerta
    ? "text-orange-400"
    : priority && livre
    ? "text-amber-300"
    : livre
    ? "text-emerald-400"
    : "text-rose-400";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02] pl-4 pr-4 py-4 flex flex-col gap-1.5 ${
        alerta || (priority && livre) ? "animate-soft-pulse" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${stripColor}`} />

      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold leading-snug pr-1">
          {priority && <span className="mr-1 text-amber-300">◆</span>}
          {name}
        </span>
        {info.mesa && (
          <span className="shrink-0 font-mono text-[10px] text-neutral-500 tabular-nums mt-0.5">
            M{info.mesa}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${labelColor}`}>
          [{livre ? "LIVRE" : "OCUPADO"}]
        </span>
        {info.origem && (
          <span
            className="font-mono text-[9px] uppercase tracking-wider text-neutral-600"
            title={info.origem === "agenda" ? "Definido pela agenda" : "Definido manualmente"}
          >
            {info.origem === "agenda" ? "◔ agenda" : "✎ manual"}
          </span>
        )}
      </div>

      <span className="font-mono text-white text-2xl font-bold tabular-nums mt-1">
        {formatElapsed(now - info.changedAt)}
      </span>

      {alerta && (
        <span className="text-orange-400 font-semibold text-[11px] mt-0.5">
          ▲ chamou T.I.
        </span>
      )}
    </div>
  );
}

function Grid({ items, now, priorityNames }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(([name, info]) => (
        <Card key={name} name={name} info={info} now={now} priorityNames={priorityNames} />
      ))}
    </div>
  );
}

function SectionHeader({ label, count, color }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className={`h-1.5 w-1.5 ${color}`} />
      <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
        [ {label} ]
      </h2>
      <span className="font-mono text-[11px] text-neutral-600">{count}</span>
      <div className="flex-1 h-px bg-white/[0.06]" />
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
    <main className="board-texture min-h-screen bg-[#0a0b0d] text-white px-6 py-8 sm:px-10">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="live-dot h-2 w-2 rounded-full bg-accent" />
          <div>
            <h1 className="font-mono text-lg font-bold tracking-widest uppercase">
              Painel<span className="text-accent">/</span>Status
            </h1>
            <p className="text-neutral-600 text-xs mt-0.5">
              atualiza automaticamente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <span className="font-mono text-neutral-500 text-sm tabular-nums hidden sm:block">
            {formatClock(new Date(now))}
          </span>
          {entries.length > 0 && (
            <button
              onClick={limparTudo}
              className="text-neutral-600 hover:text-red-400 text-xs font-medium transition-colors"
            >
              limpar tudo
            </button>
          )}
        </div>
      </header>

      {alertas.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8 flex flex-col gap-2">
          {alertas.map(([name, info]) => (
            <div
              key={name}
              className="relative overflow-hidden bg-orange-500/10 border border-orange-500/30 rounded-lg pl-4 pr-5 py-3.5 flex items-center justify-between gap-4"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-orange-500 animate-soft-pulse" />
              <span className="font-semibold text-orange-100 text-sm">
                <span className="text-orange-400 mr-1.5">▲</span>
                {name}
                {info.mesa ? ` · M${info.mesa}` : ""}
                <span className="text-orange-300/80 font-normal"> precisa de T.I.</span>
              </span>
              <button
                onClick={() => resolverAlerta(name)}
                className="bg-orange-500 hover:bg-orange-400 text-black rounded px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors shrink-0"
              >
                Resolvido
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="max-w-6xl mx-auto text-center py-24">
          <p className="font-mono text-neutral-700 text-sm tracking-widest mb-3">
            [ SEM DADOS ]
          </p>
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
        className="fixed bottom-3 right-4 font-mono text-neutral-800 hover:text-neutral-600 text-[10px] transition-colors"
      >
        /admin
      </a>
    </main>
  );
}
