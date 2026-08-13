import React, { useEffect, useMemo, useState } from "react";

const typeColors = [
  ["#7B9CC7", "#4F709F"],
  ["#B7A2C9", "#80668F"],
  ["#D9A3B8", "#A96F89"],
  ["#D9AD7C", "#A97C4E"],
  ["#A8C9A5", "#648C61"],
  ["#8EACD2", "#6084B4"],
];

const TIMELINE_PIXELS_PER_MINUTE = 3;

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

function timeToMinutes(time) {
  const [hours, minutes] = (time || "00:00")
    .slice(0, 5)
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
}

function actionInterval(action, selectedDate) {
  const start = timeToMinutes(action.start.time);
  const isMilestone = !action.end?.time;
  let end = action.end?.time
    ? timeToMinutes(action.end.time)
    : start + 30;

  if (action.end?.date && action.end.date !== selectedDate) {
    const startDay = new Date(`${selectedDate}T12:00:00`);
    const endDay = new Date(`${action.end.date}T12:00:00`);
    end += Math.round((endDay - startDay) / 86400000) * 1440;
  }

  return {
    start,
    end: isMilestone
      ? start + 15
      : end > start
      ? end
      : start + 30,
    collisionStart: isMilestone ? start - 15 : start,
    isMilestone,
  };
}

function buildTimeline(actions, selectedDate) {
  const groups = [];

  const preparedActions = actions
    .map((action) => ({
      action,
      ...actionInterval(action, selectedDate),
    }))
    .sort(
      (a, b) =>
        a.collisionStart - b.collisionStart ||
        a.start - b.start
    );

  preparedActions.forEach((entry) => {
    const { action, ...interval } = entry;
    let group = groups.at(-1);

    if (!group || interval.collisionStart >= group.end) {
      group = {
        end: interval.end,
        laneEnds: [],
        actions: [],
      };
      groups.push(group);
    } else {
      group.end = Math.max(group.end, interval.end);
    }

    let lane = group.laneEnds.findIndex(
      (laneEnd) => laneEnd <= interval.collisionStart
    );
    if (lane === -1) lane = group.laneEnds.length;
    group.laneEnds[lane] = interval.end;
    group.actions.push({ action, lane, ...interval });
  });

  const laidOut = groups.flatMap((group) =>
    group.actions.map((entry) => ({
      ...entry,
      laneCount: group.laneEnds.length,
    }))
  );
  const earliest = laidOut.length
    ? Math.min(...laidOut.map((entry) => entry.start))
    : 8 * 60;
  const latest = laidOut.length
    ? Math.max(...laidOut.map((entry) => entry.end))
    : 18 * 60;
  let rangeStart = Math.floor(earliest / 60) * 60;
  let rangeEnd = Math.ceil(latest / 60) * 60;
  if (
    laidOut.some(
      (entry) =>
        entry.isMilestone && entry.start - rangeStart < 30
    )
  ) {
    rangeStart -= 30;
  }
  if (
    laidOut.some(
      (entry) =>
        entry.isMilestone && rangeEnd - entry.start < 30
    )
  ) {
    rangeEnd += 30;
  }

  return {
    actions: laidOut,
    start: rangeStart,
    end: Math.max(rangeEnd, rangeStart + 60),
  };
}

function minutesToTime(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
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
      .filter((action) => !query || `${action.action} ${action.departure} ${action.arrival} ${action.people} ${action.responsible} ${action.notes}`.toLowerCase().includes(query))
      .filter((action) => !status || action.status === status)
      .filter((action) => !responsible || (action.people || action.responsible).split(",").map((name) => name.trim()).includes(responsible))
      .filter((action) => !mineOnly || action.isMine)
      .sort((a, b) => `${a.start.time}-${a.action}`.localeCompare(`${b.start.time}-${b.action}`));
  }, [actions, selectedDate, search, status, responsible, mineOnly]);
  const timeline = useMemo(
    () => buildTimeline(visible, selectedDate),
    [visible, selectedDate]
  );

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
      .filter(
        (action) =>
          !responsible ||
          (action.people || action.responsible)
            .split(",")
            .map((name) => name.trim())
            .includes(responsible)
      )
      .sort((a, b) =>
        `${a.start.time}-${a.action}`.localeCompare(
          `${b.start.time}-${b.action}`
        )
      );
  }

  if (loading) return <div className="p-10 text-center text-[#a1a1a8]">Chargement du déroulement logistique…</div>;

  return (
    <main className="min-h-screen bg-[#151619] px-4 py-6 text-white md:px-8">
      <div className="mx-auto w-full max-w-[1800px]">
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

        {responsible && (
          <div className="mb-4 text-sm text-[#b9b6ff]">
            L’impression contiendra seulement les actions de <strong>{responsible}</strong>.
          </div>
        )}

        {error && <div className="mb-5 rounded-lg border border-[#df2f4a] bg-[#24171a] p-4 text-sm text-[#ff8b9a]">{error}</div>}

        {visible.length === 0 ? (
          <div className="rounded-lg border border-[#303137] bg-[#1b1c20] p-6 text-center text-[#a1a1a8]">Aucune action pour ces filtres.</div>
        ) : (
          <div className="w-full rounded-xl border border-[#303137] bg-[#18191d]">
            <div
              className="relative w-full"
              style={{
                height:
                  (timeline.end - timeline.start) *
                    TIMELINE_PIXELS_PER_MINUTE +
                  1,
              }}
            >
              {Array.from(
                { length: Math.floor((timeline.end - timeline.start) / 30) + 1 },
                (_, index) => timeline.start + index * 30
              ).map((minute) => (
                <div
                  key={minute}
                  className={"absolute left-0 right-0 border-t " + (minute % 60 === 0 ? "border-[#45464e]" : "border-[#2b2c31]")}
                  style={{
                    top:
                      (minute - timeline.start) *
                      TIMELINE_PIXELS_PER_MINUTE,
                  }}
                >
                  {minute % 60 === 0 && (
                    <time className="absolute left-3 top-0 -translate-y-1/2 rounded bg-[#18191d] px-1 text-xs font-bold text-[#b9b6ff]">
                      {minutesToTime(minute)}
                    </time>
                  )}
                </div>
              ))}

              <div className="absolute bottom-0 left-[76px] top-0 border-l border-[#3a3b42]" />

              {timeline.actions.map(({ action, lane, laneCount, start, end, isMilestone }) => {
                const [background, border] = colorFor(action.type);
                const duration = end - start;
                const gap = 6;
                const laneLeftPercent =
                  (lane / laneCount) * 100;
                const laneWidthPercent =
                  100 / laneCount;
                const laneLeftCorrection =
                  84 * (lane / laneCount);
                const laneWidthCorrection =
                  84 / laneCount;
                const left = `calc(76px + ${laneLeftPercent}% - ${laneLeftCorrection}px + ${gap / 2}px)`;
                const width = `calc(${laneWidthPercent}% - ${laneWidthCorrection}px - ${gap}px)`;
                if (isMilestone) {
                  return (
                    <div
                      key={action.id}
                      className="absolute z-20"
                      style={{
                        top:
                          (start - timeline.start) *
                          TIMELINE_PIXELS_PER_MINUTE,
                        left,
                        width,
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-[#151619]"
                        style={{ backgroundColor: border }}
                      />
                      <article
                        title={`${action.start.time} · ${action.action}`}
                        className="absolute left-3 right-0 top-0 min-w-0 -translate-y-1/2 overflow-hidden rounded-lg border-l-[5px] bg-[#25262b] shadow-lg"
                        style={{ borderLeftColor: border }}
                      >
                        <div className="flex min-w-0 items-start gap-2 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#202124]" style={{ backgroundColor: background }}>Jalon · {action.type || "Logistique"}</span>
                              <span className="text-xs font-semibold text-[#b9b6ff]">{action.start.time}</span>
                            </div>
                            <h3 className="mt-1 truncate text-sm font-semibold">{action.action}</h3>
                            {action.notes && <div className="mt-1 truncate text-xs text-[#e0c98b]" title={action.notes}><span className="text-[#a99562]">Note : </span>{action.notes}</div>}
                            {(action.people || action.responsible) && <div className="mt-1 truncate text-xs text-[#c9c9ce]"><span className="text-[#85858c]">Qui : </span>{action.people || action.responsible}</div>}
                            {(action.departure || action.arrival) && <div className="mt-1 truncate text-xs text-[#c9c9ce]"><span className="text-[#85858c]">Lieu : </span>{action.departure || "—"} → {action.arrival || "—"}</div>}
                          </div>
                          {canModify ? (
                            <select aria-label={`Statut de ${action.action}`} disabled={savingId === action.id} value={action.status} onChange={(event) => changeStatus(action, event.target.value)} className="max-w-[105px] shrink-0 rounded border border-[#3a3b42] bg-[#151619] px-1.5 py-1 text-[11px] font-semibold">
                              <option value="">Sans statut</option><option>À faire</option><option>En cours</option><option>Terminé</option><option>Bloqué</option>
                            </select>
                          ) : (
                            <span className="max-w-[95px] truncate rounded bg-[#303137] px-2 py-1 text-[11px]">{action.status || "Sans statut"}</span>
                          )}
                        </div>
                      </article>
                    </div>
                  );
                }

                return (
                  <article
                    key={action.id}
                    title={`${action.start.time}–${action.end?.time || minutesToTime(end)} · ${action.action}`}
                    className="absolute min-w-0 overflow-hidden rounded-lg border-l-[5px] bg-[#25262b] shadow-lg"
                    style={{
                      top:
                        (start - timeline.start) *
                          TIMELINE_PIXELS_PER_MINUTE +
                        2,
                      height: Math.max(
                        duration * TIMELINE_PIXELS_PER_MINUTE - 4,
                        42
                      ),
                      left,
                      width,
                      borderLeftColor: border,
                    }}
                  >
                    <div className="flex h-full min-w-0 items-start gap-2 p-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#202124]" style={{ backgroundColor: background }}>{action.type || "Logistique"}</span>
                          <span className="truncate text-[11px] font-semibold text-[#b9b6ff]">{action.start.time}–{action.end?.time || minutesToTime(end)}</span>
                        </div>
                        <h3 className="mt-1 truncate text-sm font-semibold">{action.action}</h3>
                        {action.notes && <div className="mt-1 truncate text-xs text-[#e0c98b]" title={action.notes}><span className="text-[#a99562]">Note : </span>{action.notes}</div>}
                        {duration >= 30 && (action.people || action.responsible) && <div className="mt-1 truncate text-xs text-[#c9c9ce]"><span className="text-[#85858c]">Qui : </span>{action.people || action.responsible}</div>}
                        {duration >= 45 && (action.departure || action.arrival) && <div className="mt-1 truncate text-xs text-[#c9c9ce]"><span className="text-[#85858c]">Lieu : </span>{action.departure || "—"} → {action.arrival || "—"}</div>}
                      </div>
                      {canModify ? (
                        <select
                          aria-label={`Statut de ${action.action}`}
                          disabled={savingId === action.id}
                          value={action.status}
                          onChange={(event) => changeStatus(action, event.target.value)}
                          className="max-w-[105px] shrink-0 rounded border border-[#3a3b42] bg-[#151619] px-1.5 py-1 text-[11px] font-semibold"
                        >
                          <option value="">Sans statut</option><option>À faire</option><option>En cours</option><option>Terminé</option><option>Bloqué</option>
                        </select>
                      ) : duration >= 30 ? (
                        <span className="max-w-[95px] truncate rounded bg-[#303137] px-2 py-1 text-[11px]">{action.status || "Sans statut"}</span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`logistics-print-document ${printScope === "all" ? "is-all-days" : "is-single-day"}`}>
        {(printScope === "all"
          ? dates
          : dates.filter((date) => date === selectedDate)
        ).map((date) => {
          const printActions = actionsForDate(date);
          const printTimeline = buildTimeline(printActions, date);
          const printRange = printTimeline.end - printTimeline.start;

          return (
          <section key={date} className="logistics-print-day">
            <header className="logistics-print-title">
              <div>FESTIVAL VITA 2026 · DÉROULEMENT LOGISTIQUE</div>
              <h1>{displayDate(date)}</h1>
              {responsible && <strong>Responsable : {responsible}</strong>}
              <span>{printActions.length} action{printActions.length !== 1 ? "s" : ""}</span>
            </header>

            <div className="logistics-print-timeline">
              {Array.from(
                { length: Math.floor(printRange / 30) + 1 },
                (_, index) => printTimeline.start + index * 30
              ).map((minute) => (
                <div
                  key={minute}
                  className={`logistics-print-gridline ${minute % 60 === 0 ? "is-hour" : ""}`}
                  style={{ top: `${((minute - printTimeline.start) / printRange) * 100}%` }}
                >
                  {minute % 60 === 0 && <time>{minutesToTime(minute)}</time>}
                </div>
              ))}

              {printTimeline.actions.map(({ action, lane, laneCount, start, end, isMilestone }) => {
                  const [background, border] = colorFor(action.type);
                  const gap = 0.5;
                  const laneLeftPercent =
                    (lane / laneCount) * 100;
                  const laneWidthPercent =
                    100 / laneCount;
                  const laneLeftCorrection =
                    17 * (lane / laneCount);
                  const laneWidthCorrection =
                    17 / laneCount;
                  return (
                    <article
                      key={action.id}
                      className={`logistics-print-block ${isMilestone ? "is-milestone" : ""}`}
                      style={{
                        top: `${((start - printTimeline.start) / printRange) * 100}%`,
                        height: isMilestone ? undefined : `${((end - start) / printRange) * 100}%`,
                        left: `calc(15mm + ${laneLeftPercent}% - ${laneLeftCorrection}mm + ${gap}mm)`,
                        width: `calc(${laneWidthPercent}% - ${laneWidthCorrection}mm - ${gap * 2}mm)`,
                        borderLeftColor: border,
                        "--milestone-color": border,
                      }}
                    >
                      <div className="logistics-print-block-head">
                        <span style={{ backgroundColor: background }}>{isMilestone ? "Jalon · " : ""}{action.type || "Logistique"}</span>
                        <time>{action.start.time}{isMilestone ? "" : `–${action.end?.time || minutesToTime(end)}`}</time>
                        <em>{action.status || "Sans statut"}</em>
                      </div>
                      <strong>{action.action}</strong>
                      {action.notes && <small className="logistics-print-note">Note : {action.notes}</small>}
                      {(action.people || action.responsible) && <small>Qui : {action.people || action.responsible}</small>}
                      {(action.departure || action.arrival) && <small>Lieu : {action.departure || "—"} → {action.arrival || "—"}</small>}
                    </article>
                  );
                })}
            </div>
          </section>
          );
        })}
      </div>
    </main>
  );
}
