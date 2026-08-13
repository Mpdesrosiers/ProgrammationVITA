import React, { useEffect, useMemo, useState } from "react";

const typeColors = [
  ["#7B9CC7", "#4F709F"],
  ["#B7A2C9", "#80668F"],
  ["#D9A3B8", "#A96F89"],
  ["#D9AD7C", "#A97C4E"],
  ["#A8C9A5", "#648C61"],
  ["#8EACD2", "#6084B4"],
];

function colorFor(value) {
  const hash = [...(value || "Autre")].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
  return typeColors[hash % typeColors.length];
}

function displayDate(value) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

export default function LogisticsView({ canModify }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [printScope, setPrintScope] = useState("selected");

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true);
      const response = await fetch("/api/logistics");
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.details || data.error);
      }
      const valid = (data.actions || []).filter((action) => action.start?.date);
      setActions(valid);
      const dates = [...new Set(valid.map((action) => action.start.date))].sort();
      setSelectedDate((current) => current || dates[0] || "");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const dates = useMemo(
    () => [...new Set(actions.map((action) => action.start.date))].sort(),
    [actions]
  );
  const responsibles = useMemo(
    () => [...new Set(actions.flatMap((action) => (action.people || action.responsible).split(",").map((name) => name.trim())).filter(Boolean))].sort(),
    [actions]
  );
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return actions
      .filter((action) => action.start.date === selectedDate)
      .filter((action) => !query || `${action.action} ${action.departure} ${action.arrival} ${action.people} ${action.responsible}`.toLowerCase().includes(query))
      .filter((action) => !status || action.status === status)
      .filter((action) => !responsible || (action.people || action.responsible).split(",").map((name) => name.trim()).includes(responsible))
      .filter((action) => !mineOnly || action.isMine)
      .sort((a, b) => `${a.start.time}-${a.action}`.localeCompare(`${b.start.time}-${b.action}`));
  }, [actions, selectedDate, search, status, responsible, mineOnly]);

  async function changeStatus(action, newStatus) {
    setSavingId(action.id);
    const previous = action.status;
    setActions((current) => current.map((item) => item.id === action.id ? { ...item, status: newStatus } : item));
    try {
      const response = await fetch("/api/logistics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: action.id, status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error);
    } catch (err) {
      setActions((current) => current.map((item) => item.id === action.id ? { ...item, status: previous } : item));
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  function printLogistics(scope) {
    setPrintScope(scope);
    document.documentElement.dataset.printMode = "logistics";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        delete document.documentElement.dataset.printMode;
      });
    });
  }

  function actionsForDate(date) {
    return actions
      .filter((action) => action.start.date === date)
      .sort((a, b) =>
        `${a.start.time}-${a.action}`.localeCompare(
          `${b.start.time}-${b.action}`
        )
      );
  }

  if (loading) return <div className="p-10 text-center text-[#a1a1a8]">Chargement du déroulement logistique…</div>;

  return (
    <main className="min-h-screen bg-[#151619] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8580d9]">Déroulement opérationnel</div>
            <h2 className="mt-1 text-2xl font-semibold">Logistique — ligne du temps</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex overflow-hidden rounded-lg border border-[#8580d9] bg-[#24233a]">
              <button type="button" onClick={() => printLogistics("selected")} className="px-3 py-2 text-sm font-semibold text-[#b9b6ff] hover:bg-[#302e4d]">Imprimer cette journée</button>
              <button type="button" onClick={() => printLogistics("all")} className="border-l border-[#8580d9] px-3 py-2 text-sm font-semibold text-[#b9b6ff] hover:bg-[#302e4d]">Tous les jours</button>
            </div>
            <button onClick={() => load()} className="rounded-lg border border-[#3a3b42] bg-[#303137] px-4 py-2 text-sm hover:bg-[#404148]">Actualiser</button>
          </div>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {dates.map((date) => (
            <button key={date} onClick={() => setSelectedDate(date)} className={"shrink-0 rounded-lg px-4 py-2 text-sm font-semibold capitalize " + (date === selectedDate ? "bg-[#8580d9] text-[#151619]" : "bg-[#303137] hover:bg-[#404148]")}>{displayDate(date)}</button>
          ))}
        </div>

        <div className="mb-7 grid gap-3 rounded-xl border border-[#303137] bg-[#1b1c20] p-4 md:grid-cols-[1fr_190px_190px_auto]">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une action, un lieu…" className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm outline-none focus:border-[#8580d9]" />
          <select value={responsible} onChange={(event) => setResponsible(event.target.value)} className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm"><option value="">Tous les responsables</option>{responsibles.map((name) => <option key={name}>{name}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm"><option value="">Tous les statuts</option><option>À faire</option><option>En cours</option><option>Terminé</option><option>Bloqué</option></select>
          <button type="button" onClick={() => setMineOnly((current) => !current)} className={"rounded-lg px-4 py-2.5 text-sm font-semibold " + (mineOnly ? "bg-[#8580d9] text-[#151619]" : "border border-[#3a3b42] bg-[#303137] text-white hover:bg-[#404148]")}>Mes tâches</button>
        </div>

        {error && <div className="mb-5 rounded-lg border border-[#df2f4a] bg-[#24171a] p-4 text-sm text-[#ff8b9a]">{error}</div>}

        <div className="relative ml-4 border-l-2 border-[#3a3b42] md:ml-24">
          {visible.length === 0 && <div className="ml-8 rounded-lg border border-[#303137] bg-[#1b1c20] p-6 text-center text-[#a1a1a8]">Aucune action pour ces filtres.</div>}
          {visible.map((action) => {
            const [background, border] = colorFor(action.type);
            return (
              <article key={action.id} className="relative mb-4 ml-7 md:ml-12">
                <div className="absolute -left-[37px] top-5 h-4 w-4 rounded-full border-4 border-[#151619] md:-left-[57px]" style={{ backgroundColor: border }} />
                <time className="mb-1 block text-sm font-bold text-[#b9b6ff] md:absolute md:-left-[142px] md:top-4 md:w-20 md:text-right md:text-base">{action.start.time}</time>
                <div className="overflow-hidden rounded-xl border-l-[6px] bg-[#202126] shadow-lg" style={{ borderLeftColor: border }}>
                  <div className="p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2"><span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-[#202124]" style={{ backgroundColor: background }}>{action.type || "Logistique"}</span>{action.end?.time && <span className="rounded-full bg-[#303137] px-2.5 py-1 text-[11px] text-[#c9c9ce]">{action.start.time}–{action.end.time}</span>}</div>
                        <h3 className="text-lg font-semibold">{action.action}</h3>
                      </div>
                      {canModify ? <select disabled={savingId === action.id} value={action.status} onChange={(event) => changeStatus(action, event.target.value)} className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2 text-sm font-semibold"><option value="">Sans statut</option><option>À faire</option><option>En cours</option><option>Terminé</option><option>Bloqué</option></select> : <span className="rounded-lg bg-[#303137] px-3 py-2 text-sm">{action.status || "Sans statut"}</span>}
                    </div>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      {(action.departure || action.arrival) && <div><div className="text-xs uppercase text-[#85858c]">Déplacement / lieu</div><div className="mt-1">{action.departure || "—"} <span className="text-[#8580d9]">→</span> {action.arrival || "—"}</div></div>}
                      {(action.people || action.responsible) && <div><div className="text-xs uppercase text-[#85858c]">Qui</div><div className="mt-1 font-semibold">{action.people || action.responsible}</div>{action.people && action.responsible && <div className="mt-1 text-xs text-[#85858c]">Équipe : {action.responsible}</div>}</div>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="logistics-print-document">
        {(printScope === "all"
          ? dates
          : dates.filter((date) => date === selectedDate)
        ).map((date) => (
          <section key={date} className="logistics-print-day">
            <header className="logistics-print-title">
              <div>FESTIVAL VITA 2026 · DÉROULEMENT LOGISTIQUE</div>
              <h1>{displayDate(date)}</h1>
              <span>{actionsForDate(date).length} action{actionsForDate(date).length !== 1 ? "s" : ""}</span>
            </header>

            <table className="logistics-print-table">
              <thead>
                <tr>
                  <th>Heure</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Départ → Arrivée</th>
                  <th>Qui</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {actionsForDate(date).map((action) => {
                  const [background, border] = colorFor(action.type);
                  return (
                    <tr key={action.id}>
                      <td className="logistics-print-time">
                        {action.start.time}
                        {action.end?.time && <small>–{action.end.time}</small>}
                      </td>
                      <td className="logistics-print-action" style={{ borderLeftColor: border }}>{action.action}</td>
                      <td><span className="logistics-print-type" style={{ backgroundColor: background }}>{action.type || "Logistique"}</span></td>
                      <td>{action.departure || "—"} → {action.arrival || "—"}</td>
                      <td>{action.people || action.responsible || "—"}</td>
                      <td>{action.status || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </main>
  );
}
