import React, { useEffect, useMemo, useState } from "react";

const typeColors = {
  transport: ["#8EACD2", "#4F709F"],
  livraison: ["#E6B566", "#A66E20"],
  montage: ["#A8C9A5", "#5F8A5B"],
  operation: ["#B7A2C9", "#755B8B"],
  demontage: ["#D9A3B8", "#A65F7A"],
  arrivee: ["#75C2B4", "#368276"],
  depart: ["#D8C878", "#96852C"],
  empty: ["#A7A8AD", "#67686E"],
  other: ["#9EA5B3", "#626A78"],
};
const typeLegend = [
  ["Transport", "transport"],
  ["Livraison", "livraison"],
  ["Montage", "montage"],
  ["Opération", "operation"],
  ["Démontage", "demontage"],
  ["Arrivée", "arrivee"],
  ["Départ", "depart"],
  ["Sans type", "empty"],
];

const TIMELINE_PIXELS_PER_MINUTE = 3;
const LOGISTICS_COLUMNS = {
  responsible: "dropdown_mm668yr",
  status: "color_mm6622h",
  type: "color_mm66qgbk",
};

function colorFor(value) {
  const normalized = (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return typeColors.empty;
  return typeColors[normalized] || typeColors.other;
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

function groupActionsForDisplay(actions) {
  const groups = new Map();

  actions.forEach((action) => {
    const key = JSON.stringify([
      action.start?.date || "",
      action.start?.time || "",
      action.end?.date || "",
      action.end?.time || "",
      action.type || "",
      action.responsible || "",
      action.departure || "",
      action.arrival || "",
      action.status || "",
    ]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(action);
  });

  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];
    const first = group[0];
    return {
      ...first,
      id: `group-${group.map((action) => action.id).join("-")}`,
      groupedActions: group,
      action: group.map((action) => action.action).join(" · "),
      people: [...new Set(group.map((action) => action.people).filter(Boolean))].join(", "),
      notes: group.map((action) => action.notes).filter(Boolean).join(" · "),
      isMine: group.some((action) => action.isMine),
    };
  });
}

export default function LogisticsView({ canModify }) {
  const [actions, setActions] = useState([]);
  const [columnOptions, setColumnOptions] = useState({});
  const [mondayUsers, setMondayUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [printScope, setPrintScope] = useState("selected");
  const [editingAction, setEditingAction] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [undoing, setUndoing] = useState(false);
  const [syncStates, setSyncStates] = useState({});
  const [operationalMode, setOperationalMode] = useState(false);

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
      setColumnOptions(data.columnOptions || {});
      setMondayUsers(data.mondayUsers || []);
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
  const responsibleOptions = columnOptions[LOGISTICS_COLUMNS.responsible] || [];
  const statusOptions = columnOptions[LOGISTICS_COLUMNS.status] || [];
  const typeOptions = columnOptions[LOGISTICS_COLUMNS.type] || [];
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
  const displayedActions = operationalMode
    ? visible.filter((action) => action.isMine)
    : visible;
  const groupedVisibleActions = useMemo(
    () => groupActionsForDisplay(displayedActions),
    [displayedActions]
  );
  const timeline = useMemo(
    () => buildTimeline(groupedVisibleActions, selectedDate),
    [groupedVisibleActions, selectedDate]
  );

  function addHistory(label, before) {
    setHistory((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label,
        before,
        createdAt: new Date(),
      },
      ...current,
    ].slice(0, 12));
  }

  function setSync(id, state, message = "") {
    setSyncStates((current) => ({
      ...current,
      [id]: { state, message },
    }));
  }

  async function changeStatus(action, newStatus) {
    setSavingId(action.id);
    setSync(action.id, "saving");
    const previous = action.status;
    setActions((current) => current.map((item) => item.id === action.id ? { ...item, status: newStatus } : item));
    try {
      const response = await fetch("/api/logistics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: action.id, status: newStatus, expectedUpdatedAt: action.updatedAt }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error);
      addHistory(`Statut de « ${action.action} »`, action);
      setSync(action.id, "saved");
      await load(true);
    } catch (err) {
      setActions((current) => current.map((item) => item.id === action.id ? { ...item, status: previous } : item));
      setError(err.message);
      setSync(action.id, "error", err.message);
      if (err.message.includes("autre personne")) await load(true);
    } finally {
      setSavingId(null);
    }
  }

  function openEditor(action) {
    if (!canModify) return;
    setEditingAction(action);
    setEditForm({
      action: action.action || "",
      startDate: action.start?.date || "",
      startTime: action.start?.time || "",
      endDate: action.end?.date || "",
      endTime: action.end?.time || "",
      responsible: action.responsible || "",
      status: action.status || "",
      departure: action.departure || "",
      arrival: action.arrival || "",
      type: action.type || "",
      notes: action.notes || "",
      peopleEntities: action.peopleEntities || [],
    });
  }

  function openCreateEditor() {
    if (!canModify) return;
    setEditingAction(null);
    setEditForm({
      action: "",
      startDate: selectedDate || dates[0] || "",
      startTime: "08:00",
      endDate: selectedDate || dates[0] || "",
      endTime: "",
      responsible: "",
      status: "",
      departure: "",
      arrival: "",
      type: "",
      notes: "",
      peopleEntities: [],
    });
  }

  function duplicateAction() {
    if (!editingAction || !editForm) return;
    setEditingAction(null);
    setEditForm((current) => ({
      ...current,
      action: `${current.action} — copie`,
    }));
  }

  function closeEditor() {
    if (editSaving) return;
    setEditingAction(null);
    setEditForm(null);
  }

  async function saveAction(event) {
    event.preventDefault();
    if (!editForm) return;
    setEditSaving(true);
    setError("");
    if (editingAction) setSync(editingAction.id, "saving");
    try {
      const response = await fetch("/api/logistics", {
        method: editingAction ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingAction ? { itemId: editingAction.id } : {}),
          ...(editingAction ? { expectedUpdatedAt: editingAction.updatedAt } : {}),
          ...editForm,
          endDate: editForm.endTime ? editForm.endDate || editForm.startDate : "",
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.details || data.error || "Impossible d'enregistrer la modification.");
      }
      const savedDate = editForm.startDate;
      if (editingAction) {
        addHistory(`Modification de « ${editingAction.action} »`, editingAction);
        setSync(editingAction.id, "saved");
      }
      await load(true);
      setSelectedDate(savedDate);
      setEditingAction(null);
      setEditForm(null);
    } catch (err) {
      setError(err.message);
      if (editingAction) setSync(editingAction.id, "error", err.message);
      if (err.message.includes("autre personne")) await load(true);
    } finally {
      setEditSaving(false);
    }
  }

  function actionPayload(action) {
    return {
      itemId: action.id,
      expectedUpdatedAt: actions.find((item) => item.id === action.id)?.updatedAt,
      action: action.action,
      startDate: action.start?.date,
      startTime: action.start?.time,
      endDate: action.end?.date || "",
      endTime: action.end?.time || "",
      responsible: action.responsible || "",
      status: action.status || "",
      departure: action.departure || "",
      arrival: action.arrival || "",
      type: action.type || "",
      notes: action.notes || "",
      peopleEntities: action.peopleEntities || [],
    };
  }

  async function undoLastChange() {
    const entry = history[0];
    if (!entry || undoing) return;
    setUndoing(true);
    setSync(entry.before.id, "saving");
    try {
      const response = await fetch("/api/logistics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionPayload(entry.before)),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error);
      setHistory((current) => current.slice(1));
      setSync(entry.before.id, "saved");
      await load(true);
    } catch (err) {
      setError(err.message);
      setSync(entry.before.id, "error", err.message);
      await load(true);
    } finally {
      setUndoing(false);
    }
  }

  useEffect(() => {
    function handleUndo(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        const target = event.target;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName)) return;
        event.preventDefault();
        undoLastChange();
      }
    }
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, [history, undoing, actions]);

  async function deleteAction() {
    if (!editingAction || editSaving) return;
    if (!window.confirm(`Supprimer « ${editingAction.action} » de Monday?`)) return;
    setEditSaving(true);
    setSync(editingAction.id, "saving");
    try {
      const response = await fetch("/api/logistics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: editingAction.id, expectedUpdatedAt: editingAction.updatedAt }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error);
      setEditingAction(null);
      setEditForm(null);
      await load(true);
    } catch (err) {
      setError(err.message);
      setSync(editingAction.id, "error", err.message);
      if (err.message.includes("modifiée")) await load(true);
    } finally {
      setEditSaving(false);
    }
  }

  function renderActionList(action) {
    const members = action.groupedActions || [action];
    return (
      <div className="mt-1 space-y-1">
        {members.map((member) => (
          <div key={member.id} className={members.length > 1 ? "border-t border-[#3a3b42] pt-1 first:border-t-0 first:pt-0" : ""}>
            {canModify ? (
              <button type="button" onClick={(event) => { event.stopPropagation(); openEditor(member); }} className="block max-w-full truncate text-left text-sm font-semibold hover:text-[#b9b6ff]">{members.length > 1 ? "• " : ""}{member.action}</button>
            ) : (
              <div className="truncate text-sm font-semibold">{members.length > 1 ? "• " : ""}{member.action}</div>
            )}
            {member.notes && <div className="truncate text-xs text-[#e0c98b]" title={member.notes}><span className="text-[#a99562]">Note : </span>{member.notes}</div>}
            {(member.people || member.responsible) && <div className="truncate text-xs text-[#c9c9ce]"><span className="text-[#85858c]">Qui : </span>{member.people || member.responsible}</div>}
          </div>
        ))}
      </div>
    );
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

  function exportCsv(scope) {
    const escapeCsv = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const headers = [
      "ID Monday",
      "Date début",
      "Heure début",
      "Date fin",
      "Heure fin",
      "Format",
      "Action",
      "Type",
      "Responsable(s)",
      "Qui",
      "Statut",
      "Départ",
      "Arrivée",
      "Notes",
    ];
    const query = search.trim().toLowerCase();
    const exportedActions = (scope === "all" ? actions : actions.filter(
      (action) => action.start?.date === selectedDate
    ))
      .filter((action) => !query || `${action.action} ${action.departure} ${action.arrival} ${action.people} ${action.responsible} ${action.notes}`.toLowerCase().includes(query))
      .filter((action) => !status || action.status === status)
      .filter((action) => !responsible || (action.people || action.responsible).split(",").map((name) => name.trim()).includes(responsible))
      .filter((action) => !mineOnly || action.isMine)
      .sort((a, b) =>
        `${a.start?.date}-${a.start?.time}-${a.action}`.localeCompare(
          `${b.start?.date}-${b.start?.time}-${b.action}`
        )
      );
    const rows = exportedActions.map((action) => [
      action.id,
      action.start?.date,
      action.start?.time,
      action.end?.date,
      action.end?.time,
      action.end?.time ? "Action avec durée" : "Jalon",
      action.action,
      action.type,
      action.responsible,
      action.people,
      action.status,
      action.departure,
      action.arrival,
      action.notes,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = responsible
      ? `-${responsible.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
      : "";
    link.href = url;
    link.download = scope === "all"
      ? `logistique-complete${suffix}.csv`
      : `logistique-${selectedDate || "export"}${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
            <div className="flex overflow-hidden rounded-lg border border-[#8580d9] bg-[#24233a]">
              <button type="button" onClick={() => exportCsv("selected")} disabled={visible.length === 0} className="px-3 py-2 text-sm font-semibold text-[#b9b6ff] hover:bg-[#302e4d] disabled:cursor-not-allowed disabled:opacity-40">CSV cette journée</button>
              <button type="button" onClick={() => exportCsv("all")} disabled={actions.length === 0} className="border-l border-[#8580d9] px-3 py-2 text-sm font-semibold text-[#b9b6ff] hover:bg-[#302e4d] disabled:cursor-not-allowed disabled:opacity-40">CSV toute la logistique</button>
            </div>
            {canModify && (
              <button type="button" onClick={openCreateEditor} className="rounded-lg bg-[#8580d9] px-4 py-2 text-sm font-semibold text-[#151619] hover:bg-[#9995e3]">+ Ajouter une action</button>
            )}
            <button type="button" onClick={() => setOperationalMode((current) => !current)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${operationalMode ? "bg-[#62956A] text-white" : "border border-[#3a3b42] bg-[#303137] hover:bg-[#404148]"}`}>Mode opérationnel</button>
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
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm"><option value="">Tous les statuts</option>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
          <button type="button" onClick={() => setMineOnly((current) => !current)} className={"rounded-lg px-4 py-2.5 text-sm font-semibold " + (mineOnly ? "bg-[#8580d9] text-[#151619]" : "border border-[#3a3b42] bg-[#303137] text-white hover:bg-[#404148]")}>Mes tâches</button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          {typeLegend.map(([label, key]) => (
            <span key={key} className="flex items-center gap-1.5 rounded-full bg-[#202126] px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColors[key][1] }} />
              {label}
            </span>
          ))}
        </div>

        {responsible && (
          <div className="mb-4 text-sm text-[#b9b6ff]">
            L’impression contiendra seulement les actions de <strong>{responsible}</strong>.
          </div>
        )}

        {error && <div className="mb-5 rounded-lg border border-[#df2f4a] bg-[#24171a] p-4 text-sm text-[#ff8b9a]">{error}</div>}

        {canModify && history.length > 0 && (
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#303137] bg-[#1b1c20] px-4 py-3 text-sm">
            <details>
              <summary className="cursor-pointer font-semibold">Historique ({history.length}) — {history[0].label}</summary>
              <div className="mt-2 space-y-1 text-[#c9c9ce]">{history.map((entry) => <div key={entry.id}>{entry.label} <span className="text-[#85858c]">· {entry.createdAt.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div>
            </details>
            <button type="button" onClick={undoLastChange} disabled={undoing} className="rounded bg-[#303137] px-3 py-1.5 font-semibold hover:bg-[#404148] disabled:opacity-50">{undoing ? "Annulation…" : "Annuler (Ctrl+Z)"}</button>
          </div>
        )}

        {operationalMode && (
          <div className="mb-5 rounded-lg border border-[#62956A] bg-[#1c2a1f] p-4">
            <div className="font-semibold text-[#9bd2a0]">Mode opérationnel — Mes actions</div>
            <div className="mt-1 text-sm text-[#c9c9ce]">Vue simplifiée pour téléphone, limitée aux actions qui te sont assignées dans la colonne « Qui ».</div>
          </div>
        )}

        {displayedActions.length === 0 ? (
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
                        role={canModify && !action.groupedActions ? "button" : undefined}
                        tabIndex={canModify && !action.groupedActions ? 0 : undefined}
                        onClick={() => { if (!action.groupedActions) openEditor(action); }}
                        onKeyDown={(event) => {
                          if (!action.groupedActions && (event.key === "Enter" || event.key === " ")) openEditor(action);
                        }}
                        className={`absolute left-3 right-0 top-0 min-w-0 -translate-y-1/2 overflow-hidden rounded-lg border-l-[5px] bg-[#25262b] shadow-lg ${canModify && !action.groupedActions ? "cursor-pointer hover:bg-[#2d2e34]" : ""}`}
                        style={{ borderLeftColor: border }}
                      >
                        <div className="flex min-w-0 items-start gap-2 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#202124]" style={{ backgroundColor: background }}>Jalon · {action.type || "Sans type"}</span>
                              <span className="text-xs font-semibold text-[#b9b6ff]">{action.start.time}</span>
                            </div>
                            {renderActionList(action)}
                            {!action.groupedActions && syncStates[action.id] && <div className={`mt-1 text-[11px] font-semibold ${syncStates[action.id].state === "error" ? "text-[#ff8b9a]" : syncStates[action.id].state === "saving" ? "text-[#e0c98b]" : "text-[#9bd2a0]"}`}>{syncStates[action.id].state === "saving" ? "Sauvegarde…" : syncStates[action.id].state === "error" ? "Erreur de synchronisation" : "✓ Synchronisé avec Monday"}</div>}
                            {(action.departure || action.arrival) && <div className="mt-1 truncate text-xs text-[#c9c9ce]"><span className="text-[#85858c]">Lieu : </span>{action.departure || "—"} → {action.arrival || "—"}</div>}
                          </div>
                          {canModify && !action.groupedActions ? (
                            <select aria-label={`Statut de ${action.action}`} onClick={(event) => event.stopPropagation()} disabled={savingId === action.id} value={action.status} onChange={(event) => changeStatus(action, event.target.value)} className="max-w-[105px] shrink-0 rounded border border-[#3a3b42] bg-[#151619] px-1.5 py-1 text-[11px] font-semibold">
                              <option value="">Sans statut</option>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
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
                    role={canModify && !action.groupedActions ? "button" : undefined}
                    tabIndex={canModify && !action.groupedActions ? 0 : undefined}
                    onClick={() => { if (!action.groupedActions) openEditor(action); }}
                    onKeyDown={(event) => {
                      if (!action.groupedActions && (event.key === "Enter" || event.key === " ")) openEditor(action);
                    }}
                    className={`absolute min-w-0 overflow-hidden rounded-lg border-l-[5px] bg-[#25262b] shadow-lg ${canModify && !action.groupedActions ? "cursor-pointer hover:bg-[#2d2e34]" : ""}`}
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
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#202124]" style={{ backgroundColor: background }}>{action.type || "Sans type"}</span>
                          <span className="truncate text-[11px] font-semibold text-[#b9b6ff]">{action.start.time}–{action.end?.time || minutesToTime(end)}</span>
                        </div>
                        {renderActionList(action)}
                        {!action.groupedActions && syncStates[action.id] && <div className={`mt-1 text-[11px] font-semibold ${syncStates[action.id].state === "error" ? "text-[#ff8b9a]" : syncStates[action.id].state === "saving" ? "text-[#e0c98b]" : "text-[#9bd2a0]"}`}>{syncStates[action.id].state === "saving" ? "Sauvegarde…" : syncStates[action.id].state === "error" ? "Erreur de synchronisation" : "✓ Synchronisé avec Monday"}</div>}
                        {duration >= 45 && (action.departure || action.arrival) && <div className="mt-1 truncate text-xs text-[#c9c9ce]"><span className="text-[#85858c]">Lieu : </span>{action.departure || "—"} → {action.arrival || "—"}</div>}
                      </div>
                      {canModify && !action.groupedActions ? (
                        <select
                          aria-label={`Statut de ${action.action}`}
                          onClick={(event) => event.stopPropagation()}
                          disabled={savingId === action.id}
                          value={action.status}
                          onChange={(event) => changeStatus(action, event.target.value)}
                          className="max-w-[105px] shrink-0 rounded border border-[#3a3b42] bg-[#151619] px-1.5 py-1 text-[11px] font-semibold"
                        >
                          <option value="">Sans statut</option>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
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

      {editForm && (
        <div
          className="no-print fixed inset-0 z-[5000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <form onSubmit={saveAction} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#3a3b42] bg-[#1b1c20] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase text-[#8580d9]">Modification Monday</div>
                <h2 className="mt-1 text-xl font-semibold">{editingAction ? "Modifier l’action logistique" : "Ajouter une action logistique"}</h2>
              </div>
              <button type="button" onClick={closeEditor} className="rounded px-2 py-1 text-xl text-[#a1a1a8] hover:bg-[#303137] hover:text-white">×</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2 text-sm">Action
                <input required value={editForm.action} onChange={(event) => setEditForm((current) => ({ ...current, action: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5" />
              </label>
              <label className="text-sm">Date de début
                <input required type="date" value={editForm.startDate} onChange={(event) => setEditForm((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5" />
              </label>
              <label className="text-sm">Heure de début
                <input required type="time" step="60" value={editForm.startTime} onChange={(event) => setEditForm((current) => ({ ...current, startTime: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5" />
              </label>
              <label className="text-sm">Date de fin
                <input type="date" value={editForm.endDate} onChange={(event) => setEditForm((current) => ({ ...current, endDate: event.target.value }))} disabled={!editForm.endTime} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 disabled:opacity-40" />
              </label>
              <label className="text-sm">Heure de fin
                <input type="time" step="60" value={editForm.endTime} onChange={(event) => setEditForm((current) => ({ ...current, endTime: event.target.value, endDate: event.target.value ? current.endDate || current.startDate : "" }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5" />
                <span className="mt-1 block text-xs text-[#85858c]">Laisse vide pour afficher un jalon.</span>
              </label>
              <div className="text-sm">Responsable(s)
                <details className="relative mt-1 rounded-lg border border-[#3a3b42] bg-[#151619]">
                  <summary className="cursor-pointer list-none px-3 py-2.5">{editForm.responsible || "Aucun responsable"}</summary>
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-[#3a3b42] bg-[#202126] p-2 shadow-xl">
                    {responsibleOptions.map((option) => {
                      const selected = editForm.responsible.split(",").map((label) => label.trim()).filter(Boolean);
                      return <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#303137]"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => setEditForm((current) => { const currentLabels = current.responsible.split(",").map((label) => label.trim()).filter(Boolean); const next = event.target.checked ? [...new Set([...currentLabels, option])] : currentLabels.filter((label) => label !== option); return { ...current, responsible: next.join(", ") }; })} />{option}</label>;
                    })}
                    {responsibleOptions.length === 0 && <div className="px-2 py-1 text-[#85858c]">Aucune option configurée dans Monday.</div>}
                  </div>
                </details>
              </div>
              <label className="text-sm">Statut
                <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5">
                  <option value="">Sans statut</option>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm">Type
                <select value={editForm.type} onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5"><option value="">Sans type</option>{typeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              </label>
              <div className="text-sm">Qui — personne(s) assignée(s)
                <details className="relative mt-1 rounded-lg border border-[#3a3b42] bg-[#151619]">
                  <summary className="cursor-pointer list-none px-3 py-2.5">{editForm.peopleEntities.length ? editForm.peopleEntities.map((entity) => mondayUsers.find((user) => user.id === String(entity.id))?.name).filter(Boolean).join(", ") : "Aucune personne"}</summary>
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#3a3b42] bg-[#202126] p-2 shadow-xl">
                    {mondayUsers.map((user) => {
                      const selected = editForm.peopleEntities.some((entity) => String(entity.id) === user.id && entity.kind === "person");
                      return <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#303137]"><input type="checkbox" checked={selected} onChange={(event) => setEditForm((current) => ({ ...current, peopleEntities: event.target.checked ? [...current.peopleEntities.filter((entity) => String(entity.id) !== user.id), { id: user.id, kind: "person" }] : current.peopleEntities.filter((entity) => String(entity.id) !== user.id) }))} /><span>{user.name}</span></label>;
                    })}
                    {mondayUsers.length === 0 && <div className="px-2 py-1 text-[#85858c]">Aucun compte Monday accessible.</div>}
                  </div>
                </details>
              </div>
              <label className="text-sm">Départ
                <input value={editForm.departure} onChange={(event) => setEditForm((current) => ({ ...current, departure: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5" />
              </label>
              <label className="text-sm">Arrivée
                <input value={editForm.arrival} onChange={(event) => setEditForm((current) => ({ ...current, arrival: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5" />
              </label>
              <label className="md:col-span-2 text-sm">Notes
                <textarea rows="4" value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5" />
              </label>
            </div>

            {error && <div className="mt-4 rounded-lg border border-[#df2f4a] bg-[#24171a] p-3 text-sm text-[#ff8b9a]">{error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              {editingAction && <button type="button" onClick={deleteAction} disabled={editSaving} className="mr-auto rounded-lg border border-[#df2f4a] bg-[#24171a] px-4 py-2 text-sm font-semibold text-[#ff8b9a] disabled:opacity-50">Supprimer</button>}
              {editingAction && <button type="button" onClick={duplicateAction} disabled={editSaving} className="rounded-lg border border-[#3a3b42] bg-[#303137] px-4 py-2 text-sm font-semibold disabled:opacity-50">Dupliquer</button>}
              <button type="button" onClick={closeEditor} disabled={editSaving} className="rounded-lg border border-[#3a3b42] bg-[#303137] px-4 py-2 text-sm font-semibold disabled:opacity-50">Annuler</button>
              <button type="submit" disabled={editSaving} className="rounded-lg bg-[#8580d9] px-4 py-2 text-sm font-semibold text-[#151619] disabled:opacity-50">{editSaving ? "Sauvegarde…" : editingAction ? "Enregistrer dans Monday" : "Ajouter dans Monday"}</button>
            </div>
          </form>
        </div>
      )}

      <div className={`logistics-print-document ${printScope === "all" ? "is-all-days" : "is-single-day"}`}>
        {(printScope === "all"
          ? dates
          : dates.filter((date) => date === selectedDate)
        ).map((date) => {
          const printActions = actionsForDate(date);
          const printTimeline = buildTimeline(
            groupActionsForDisplay(printActions),
            date
          );
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
                        <span style={{ backgroundColor: background }}>{isMilestone ? "Jalon · " : ""}{action.type || "Sans type"}</span>
                        <time>{action.start.time}{isMilestone ? "" : `–${action.end?.time || minutesToTime(end)}`}</time>
                        <em>{action.status || "Sans statut"}</em>
                      </div>
                      {(action.groupedActions || [action]).map((member) => (
                        <div key={member.id} className="logistics-print-member">
                          <strong>{action.groupedActions ? "• " : ""}{member.action}</strong>
                          {member.notes && <small className="logistics-print-note">Note : {member.notes}</small>}
                          {(member.people || member.responsible) && <small>Qui : {member.people || member.responsible}</small>}
                        </div>
                      ))}
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
