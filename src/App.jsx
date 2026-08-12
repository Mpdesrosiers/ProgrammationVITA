import React, { useEffect, useMemo, useState } from "react";

const zones = [
  "Terrain synthétique",
  "Asphalte",
  "Zone démo",
  "Zone Famille",
  "Kiosques",
  "Scène",
  "Tente VIP",
];

const days = [
  {
    label: "Jeudi",
    mondayLabel: "sept. 17",
    date: "2026-09-17",
  },
  {
    label: "Vendredi",
    mondayLabel: "sept. 18",
    date: "2026-09-18",
  },
  {
    label: "Samedi",
    mondayLabel: "sept. 19",
    date: "2026-09-19",
  },
  {
    label: "Dimanche",
    mondayLabel: "sept. 20",
    date: "2026-09-20",
  },
];

const times = [
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
];

const zoneColors = {
  "Terrain synthétique": {
    background: "#7B9CC7",
    border: "#4F709F",
  },

  Asphalte: {
    background: "#8EACD2",
    border: "#6084B4",
  },

  "Zone démo": {
    background: "#B8D0E8",
    border: "#7F9FBE",
  },

  "Zone Famille": {
    background: "#B7A2C9",
    border: "#80668F",
  },

  Kiosques: {
    background: "#D9A3B8",
    border: "#A96F89",
  },

  Scène: {
    background: "#C68EAA",
    border: "#975B79",
  },

  "Tente VIP": {
    background: "#D9AD7C",
    border: "#A97C4E",
  },
};

const specialCategoryColors = {
  "Montage/Démontage": {
    background: "#A8C9A5",
    border: "#648C61",
  },

  "Arrivée/Départ": {
    background: "#62956A",
    border: "#3F6846",
  },
};

const COLUMN_IDS = {
  activite: "text_mm5z84v8",
  debut: "date_mm63hcxz",
  fin: "date_mm63gzbs",
  volet: "dropdown_mm63ffn6",
  zone: "color_mm63vn4d",
  status: "status",
  categorieCouleur: "color_mm63ahs6",
  notes: "text_mm5z2k1c",
};

function getColumn(item, columnId) {
  const column = item.column_values?.find(
    (col) => col.id === columnId
  );

  return column?.text || "";
}

function getDate(item) {
  const column = item.column_values?.find(
    (col) => col.id === COLUMN_IDS.debut
  );

  if (!column?.text) return "";

  const match = column.text.match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  return match ? match[1] : "";
}

function getTime(item, columnId) {
  const text = getColumn(item, columnId);

  if (!text) return "";

  const match = text.match(/(\d{2}:\d{2})$/);

  if (!match) return "";

  const [hours, minutes] = match[1]
    .split(":")
    .map(Number);

  // Monday nous renvoie une heure décalée d'une heure.
  // On retire donc 1 heure pour retrouver l'heure
  // affichée dans notre programmation.

  const totalMinutes =
    hours * 60 + minutes - 60;

  return minutesToTime(totalMinutes);
}

function timeToMinutes(time) {
  if (!time) return 0;

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  totalMinutes =
    ((totalMinutes % 1440) + 1440) % 1440;

  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(2, "0")}`;
}

function getActivityColor(activity) {
  const category =
    activity.categorieCouleur?.trim();

  if (
    category &&
    specialCategoryColors[category]
  ) {
    return specialCategoryColors[category];
  }

  return (
    zoneColors[activity.zone] || {
      background: "#8580d9",
      border: "#625EA8",
    }
  );
}

function App() {
  const [authLoading, setAuthLoading] =
    useState(true);

  const [user, setUser] =
    useState(null);

  const [authError, setAuthError] =
    useState("");

  const [selectedDay, setSelectedDay] =
    useState("2026-09-18");

  const [calendarZoom, setCalendarZoom] =
    useState(100);

  const [activities, setActivities] =
    useState([]);

  const [mondayColumnOptions, setMondayColumnOptions] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [draggedGroup, setDraggedGroup] =
    useState(null);

  const [dragPreview, setDragPreview] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const [lastSyncedAt, setLastSyncedAt] =
    useState(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [zoneFilter, setZoneFilter] =
    useState("");

  const [voletFilter, setVoletFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [history, setHistory] =
    useState([]);

  const [undoing, setUndoing] =
    useState(false);

  const [contextMenu, setContextMenu] =
    useState(null);

  const [printScope, setPrintScope] =
    useState("selected");

  const [copiedActivity, setCopiedActivity] =
    useState(null);

  const [managingAccess, setManagingAccess] =
    useState(false);

  const [accessUsers, setAccessUsers] =
    useState([]);

  const [accessForm, setAccessForm] =
    useState({
      name: "",
      email: "",
      role: "Consultation",
    });

  const [accessError, setAccessError] =
    useState("");

  const [accessSaving, setAccessSaving] =
    useState(false);

  /*
   * ================================
   * POPUP MODIFICATION
   * ================================
   */

  const [editingItem, setEditingItem] =
    useState(null);

  const [editForm, setEditForm] =
    useState({
      activite: "",
      date: "",
      debut: "",
      fin: "",
      zone: "",
    });

  const [editSaving, setEditSaving] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  /*
   * ================================
   * POPUP CRÉATION
   * ================================
   */

  const [creatingActivity, setCreatingActivity] =
    useState(false);

  const [duplicatingActivity, setDuplicatingActivity] =
    useState(null);

  const [createForm, setCreateForm] =
    useState({
      activite: "",
      date: "",
      debut: "",
      fin: "",
      volet: "",
      zone: "",
      status: "",
      categorieCouleur: "",
      notes: "",
    });

  const [createSaving, setCreateSaving] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  /*
   * ================================
   * CHARGEMENT MONDAY
   * ================================
   */

  async function loadActivities(silent = false) {
    try {
      if (!silent) {
        setLoading(true);
      }

      const response =
        await fetch("/api/monday");

      const data =
        await response.json();

      if (
        !response.ok ||
        data.error
      ) {
        throw new Error(
          (
              Array.isArray(data.details)
                ? data.details[0]?.message
                : data.details
            ) ||
            data.error ||
            "Impossible de charger les données."
        );
      }

      const board =
        data.data?.boards?.[0];

      const items =
        board?.items_page?.items || [];

      setMondayColumnOptions(
        board?.columnOptions || {}
      );

      const formattedActivities =
        items
          .map((item) => ({
            id: item.id,

            mondayId: item.name,

            updatedAt:
              item.updated_at || "",

            activite: getColumn(
              item,
              COLUMN_IDS.activite
            ),

            date: getDate(item),

            debut: getTime(
              item,
              COLUMN_IDS.debut
            ),

            fin: getTime(
              item,
              COLUMN_IDS.fin
            ),

            volet: getColumn(
              item,
              COLUMN_IDS.volet
            ),

            zone: getColumn(
              item,
              COLUMN_IDS.zone
            ),

            status: getColumn(
              item,
              COLUMN_IDS.status
            ),

            categorieCouleur:
              getColumn(
                item,
                COLUMN_IDS.categorieCouleur
              ),

            notes: getColumn(
              item,
              COLUMN_IDS.notes
            ),
          }))
          .filter(
            (activity) =>
              activity.activite &&
              activity.debut &&
              activity.fin
          );

      setActivities(
        formattedActivities
      );

      setLastSyncedAt(new Date());

      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    async function loadSession() {
      const params = new URLSearchParams(
        window.location.search
      );
      const returnedError =
        params.get("authError");

      if (returnedError) {
        setAuthError(returnedError);
        window.history.replaceState(
          {},
          "",
          window.location.pathname
        );
      }

      try {
        const response = await fetch(
          "/api/auth/session"
        );
        const data = await response.json();

        if (response.ok && data.user) {
          setUser(data.user);
          await loadActivities();
        } else {
          setLoading(false);
        }
      } catch {
        setAuthError(
          "Impossible de vérifier la connexion."
        );
        setLoading(false);
      } finally {
        setAuthLoading(false);
      }
    }

    loadSession();
  }, []);

  const canModify =
    user?.role === "Modification";

  /*
   * Synchronisation collaborative silencieuse.
   * On la met en pause pendant une interaction pour ne pas
   * remplacer un changement local en cours.
   */

  useEffect(() => {
    if (!user) return;

    const isBusy =
      editingItem ||
      creatingActivity ||
      draggedGroup ||
      saving ||
      editSaving ||
      createSaving;

    if (isBusy) return;

    const refresh = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadActivities(true);
      }
    };

    const interval = setInterval(
      refresh,
      10000
    );

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    return () => {
      clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        refresh
      );
    };
  }, [
    user,
    editingItem,
    creatingActivity,
    draggedGroup,
    saving,
    editSaving,
    createSaving,
  ]);

  /*
   * ================================
   * AUTO-SCROLL PENDANT LE DRAG
   * ================================
   */

  useEffect(() => {
    if (!draggedGroup) return;

    let animationFrame = null;

    function handleDragOver(event) {
      const edgeSize = 120;
      const maxSpeed = 18;

      const mouseY = event.clientY;
      const windowHeight =
        window.innerHeight;

      let scrollAmount = 0;

      if (
        mouseY >
        windowHeight - edgeSize
      ) {
        const intensity =
          1 -
          (windowHeight - mouseY) /
            edgeSize;

        scrollAmount =
          Math.max(
            2,
            intensity * maxSpeed
          );
      } else if (
        mouseY < edgeSize
      ) {
        const intensity =
          1 - mouseY / edgeSize;

        scrollAmount =
          -Math.max(
            2,
            intensity * maxSpeed
          );
      }

      if (scrollAmount !== 0) {
        if (!animationFrame) {
          animationFrame =
            requestAnimationFrame(() => {
              window.scrollBy(
                0,
                scrollAmount
              );

              animationFrame = null;
            });
        }
      }
    }

    window.addEventListener(
      "dragover",
      handleDragOver
    );

    return () => {
      window.removeEventListener(
        "dragover",
        handleDragOver
      );

      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame
        );
      }
    };
  }, [draggedGroup]);

  /*
   * ================================
   * ACTIVITÉS DU JOUR
   * ================================
   */

  const selectedActivities =
    useMemo(() => {
      const normalizedSearch =
        searchTerm.trim().toLowerCase();

      return activities.filter(
        (activity) =>
          activity.date === selectedDay &&
          (
            !normalizedSearch ||
            activity.activite
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(activity.mondayId)
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(activity.id)
              .includes(normalizedSearch)
          ) &&
          (!zoneFilter ||
            activity.zone === zoneFilter) &&
          (!voletFilter ||
            activity.volet === voletFilter) &&
          (!statusFilter ||
            activity.status === statusFilter)
      );
    }, [
      activities,
      selectedDay,
      searchTerm,
      zoneFilter,
      voletFilter,
      statusFilter,
    ]);

  function addHistory(entry) {
    setHistory((current) =>
      [
        {
          id: `${Date.now()}-${Math.random()}`,
          createdAt: new Date(),
          ...entry,
        },
        ...current,
      ].slice(0, 10)
    );
  }

  async function handleUndo() {
    const entry = history.find(
      (item) => item.before?.length
    );

    if (!entry || undoing) return;

    setUndoing(true);
    setSaveMessage("Annulation…");

    try {
      await Promise.all(
        entry.before.map(async (previous) => {
          const current = activities.find(
            (item) => item.id === previous.id
          );

          const response = await fetch(
            "/api/monday",
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                itemId: previous.id,
                expectedUpdatedAt:
                  current?.updatedAt,
                activite:
                  previous.activite,
                startDate: previous.date,
                startTime: previous.debut,
                endDate: previous.date,
                endTime: previous.fin,
                zone: previous.zone,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok || data.error) {
            throw new Error(
              data.error ||
                "Impossible d'annuler la modification."
            );
          }
        })
      );

      setHistory((current) =>
        current.filter(
          (item) => item.id !== entry.id
        )
      );

      await loadActivities(true);
      setSaveMessage(
        "✓ Dernière modification annulée"
      );
    } catch (err) {
      await loadActivities(true);
      setSaveMessage(
        `⚠️ ${err.message}`
      );
    } finally {
      setUndoing(false);
    }
  }

  useEffect(() => {
    function handleUndoShortcut(event) {
      const isUndo =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey;

      if (!isUndo || event.repeat) return;

      const target = event.target;
      const isEditingField =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            target.tagName
          )
        );

      if (isEditingField) return;

      const canUndo =
        history.some(
          (entry) => entry.before?.length
        );

      if (!canUndo || undoing) return;

      event.preventDefault();
      handleUndo();
    }

    window.addEventListener(
      "keydown",
      handleUndoShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleUndoShortcut
      );
    };
  }, [history, activities, undoing]);

  useEffect(() => {
    function protectUnsavedWork(event) {
      if (
        !saving &&
        !editSaving &&
        !createSaving &&
        !undoing
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      protectUnsavedWork
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        protectUnsavedWork
      );
    };
  }, [
    saving,
    editSaving,
    createSaving,
    undoing,
  ]);

  /*
   * ================================
   * GROUPES
   * ================================
   */

  const activityGroups =
    useMemo(() => {
      const groups = {};

      selectedActivities.forEach(
        (activity) => {
          const key = [
            activity.date,
            activity.zone,
            activity.debut,
            activity.fin,
          ].join("|");

          if (!groups[key]) {
            groups[key] = {
              id: key,
              date: activity.date,
              zone: activity.zone,
              debut: activity.debut,
              fin: activity.fin,
              activities: [],
            };
          }

          groups[key].activities.push(
            activity
          );
        }
      );

      return Object.values(groups);
    }, [selectedActivities]);

  function getGroupHeight(group) {
    const start =
      timeToMinutes(group.debut);

    const end =
      timeToMinutes(group.fin);

    const duration =
      end - start;

    return Math.max(
      (duration / 30) * 42 - 6,
      8
    );
  }

  function getGroupTimeSlot(group) {
    const start =
      timeToMinutes(group.debut);

    return minutesToTime(
      Math.floor(start / 30) * 30
    );
  }

  function getGroupTopOffset(group) {
    const start =
      timeToMinutes(group.debut);

    const slotStart =
      Math.floor(start / 30) * 30;

    return (
      ((start - slotStart) / 30) *
        42 +
      2
    );
  }

  function getPrintGroups(dayDate) {
    const groups = {};

    activities
      .filter(
        (activity) =>
          activity.date === dayDate
      )
      .forEach((activity) => {
        const key = [
          activity.zone,
          activity.debut,
          activity.fin,
        ].join("|");

        if (!groups[key]) {
          groups[key] = {
            zone: activity.zone,
            debut: activity.debut,
            fin: activity.fin,
            activities: [],
          };
        }

        groups[key].activities.push(
          activity
        );
      });

    return Object.values(groups);
  }

  function handlePrint(scope) {
    setPrintScope(scope);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  /*
   * ================================
   * DRAG & DROP
   * ================================
   */

  function handleDragStart(group) {
    setDraggedGroup(group);

    setDragPreview({
      time: group.debut,
      zone: group.zone,
    });

    setSaveMessage("");
  }

  function handleDragEnd() {
    setDraggedGroup(null);
    setDragPreview(null);
  }

  function findCellUnderMouse(event) {
    const elements =
      document.elementsFromPoint(
        event.clientX,
        event.clientY
      );

    const cell =
      elements.find(
        (element) =>
          element.dataset &&
          element.dataset.time &&
          element.dataset.zone
      );

    if (!cell) return null;

    return {
      element: cell,
      time: cell.dataset.time,
      zone: cell.dataset.zone,
    };
  }

  function getPreciseDropTime(
    cell,
    clientY
  ) {
    const rect =
      cell.getBoundingClientRect();

    const relativeY =
      clientY - rect.top;

    const half =
      relativeY >= 21
        ? 30
        : 0;

    const baseTime =
      timeToMinutes(
        cell.dataset.time
      );

    return minutesToTime(
      baseTime + half
    );
  }

  function updateDragPreview(event) {
    if (!draggedGroup) return;

    const target =
      findCellUnderMouse(event);

    if (!target) return;

    const preciseTime =
      getPreciseDropTime(
        target.element,
        event.clientY
      );

    setDragPreview({
      time: preciseTime,
      zone: target.zone,
    });
  }

  async function handleDrop(event) {
    event.preventDefault();

    if (!draggedGroup) return;

    const target =
      findCellUnderMouse(event);

    if (!target) return;

    const newZone =
      target.zone;

    const newStartTime =
      getPreciseDropTime(
        target.element,
        event.clientY
      );

    const oldStart =
      timeToMinutes(
        draggedGroup.debut
      );

    const oldEnd =
      timeToMinutes(
        draggedGroup.fin
      );

    const duration =
      oldEnd - oldStart;

    const newStart =
      timeToMinutes(
        newStartTime
      );

    const newEnd =
      newStart + duration;

    const newEndTime =
      minutesToTime(newEnd);

    const draggedIds =
      draggedGroup.activities.map(
        (activity) => activity.id
      );

    setActivities((current) =>
      current.map((activity) =>
        draggedIds.includes(
          activity.id
        )
          ? {
              ...activity,
              zone: newZone,
              debut: newStartTime,
              fin: newEndTime,
            }
          : activity
      )
    );

    setDraggedGroup(null);
    setDragPreview(null);

    setSaving(true);
    setSaveMessage("");

    try {
      const saveRequests =
        draggedGroup.activities.map(
          async (activity) => {
            const response =
              await fetch(
                "/api/monday",
                {
                  method: "PUT",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify({
                    itemId:
                      activity.id,

                    expectedUpdatedAt:
                      activity.updatedAt,

                    startDate:
                      activity.date,

                    startTime:
                      newStartTime,

                    endDate:
                      activity.date,

                    endTime:
                      newEndTime,

                    zone: newZone,
                  }),
                }
              );

            const data =
              await response.json();

            if (
              !response.ok ||
              data.error
            ) {
              throw new Error(
                (
                  Array.isArray(data.details)
                    ? data.details[0]?.message
                    : data.details
                ) ||
                  data.error ||
                  "Erreur lors de la sauvegarde dans Monday."
              );
            }

            return data;
          }
        );

      await Promise.all(
        saveRequests
      );

      addHistory({
        label: `Déplacement de ${draggedGroup.activities.length} activité${draggedGroup.activities.length > 1 ? "s" : ""}`,
        before:
          draggedGroup.activities.map(
            (activity) => ({ ...activity })
          ),
      });

      await loadActivities(true);

      setSaveMessage(
        "✓ Modification confirmée dans Monday"
      );
    } catch (err) {
      console.error(err);

      setSaveMessage(
        "⚠️ Le changement est affiché, mais la sauvegarde dans Monday a échoué."
      );

      await loadActivities(true);
    } finally {
      setSaving(false);
    }
  }

  /*
   * ================================
   * OUVERTURE DU POPUP MODIFICATION
   * ================================
   */

  function openActivityEditor(activity) {
    if (!canModify) return;
    setEditError("");

    setEditingItem({
      type: "activity",
      activity,
    });

    setEditForm({
      activite:
        activity.activite || "",

      date:
        activity.date || selectedDay,

      debut:
        activity.debut || "05:30",

      fin:
        activity.fin || "06:00",

      zone:
        activity.zone ||
        zones[0],
    });
  }

  function openGroupEditor(group) {
    if (!canModify) return;
    setEditError("");

    setEditingItem({
      type: "group",
      group,
    });

    setEditForm({
      activite: "",

      date:
        group.date || selectedDay,

      debut:
        group.debut || "05:30",

      fin:
        group.fin || "06:00",

      zone:
        group.zone ||
        zones[0],
    });
  }

  function closeEditor() {
    if (editSaving) return;

    setEditingItem(null);
    setEditError("");
  }

  function openActivityContextMenu(
    event,
    group
  ) {
    if (!canModify) return;
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      x: Math.min(
        event.clientX,
        window.innerWidth - 300
      ),
      y: Math.min(
        event.clientY,
        window.innerHeight - 220
      ),
      activities: group.activities,
    });
  }

  useEffect(() => {
    if (!contextMenu) return;

    const close = () =>
      setContextMenu(null);

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener(
        "scroll",
        close,
        true
      );
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, [contextMenu]);

  /*
   * ================================
   * OUVERTURE DU POPUP AJOUT
   * ================================
   */

  function openCreateEditor(
    time = "05:30",
    zone = zones[0]
  ) {
    if (!canModify) return;
    setCreateError("");
    setDuplicatingActivity(null);

    const startMinutes =
      timeToMinutes(time);

    const endMinutes =
      startMinutes + 30;

    setCreateForm({
      activite: "",
      date: selectedDay,
      debut: time,
      fin: minutesToTime(
        endMinutes
      ),
      volet: "",
      zone: zone,
      status: "",
      categorieCouleur: "",
      notes: "",
    });

    setCreatingActivity(true);
  }

  function closeCreateEditor() {
    if (createSaving) return;

    setCreatingActivity(false);
    setDuplicatingActivity(null);
    setCreateError("");
  }

  /*
   * ================================
   * SAUVEGARDE DU POPUP MODIFICATION
   * ================================
   */

  async function handleSaveEditor() {
    if (!editingItem) return;

    setEditSaving(true);
    setEditError("");

    try {
      const newDate =
        editForm.date;

      const newStart =
        editForm.debut;

      const newEnd =
        editForm.fin;

      const newZone =
        editForm.zone;

      if (!newDate) {
        throw new Error(
          "Veuillez choisir une journée."
        );
      }

      if (!newStart || !newEnd) {
        throw new Error(
          "Veuillez choisir une heure de début et de fin."
        );
      }

      if (
        timeToMinutes(newEnd) <=
        timeToMinutes(newStart)
      ) {
        throw new Error(
          "L'heure de fin doit être après l'heure de début."
        );
      }

      /*
       * ACTIVITÉ INDIVIDUELLE
       */

      if (
        editingItem.type ===
        "activity"
      ) {
        const activity =
          editingItem.activity;

        const response =
          await fetch(
            "/api/monday",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                itemId: activity.id,

                expectedUpdatedAt:
                  activity.updatedAt,

                activite:
                  editForm.activite,

                startDate:
                  newDate,

                startTime:
                  newStart,

                endDate:
                  newDate,

                endTime:
                  newEnd,

                zone: newZone,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.error
        ) {
          throw new Error(
            data.details?.[0]
              ?.message ||
              data.error ||
              "Impossible de sauvegarder la modification."
          );
        }

        setActivities((current) =>
          current.map((item) =>
            item.id === activity.id
              ? {
                  ...item,

                  activite:
                    editForm.activite,

                  date: newDate,

                  debut: newStart,

                  fin: newEnd,

                  zone: newZone,
                }
              : item
          )
        );

        addHistory({
          label: `Modification de « ${activity.activite} »`,
          before: [{ ...activity }],
        });
      }

      /*
       * GROUPE
       */

      else if (
        editingItem.type ===
        "group"
      ) {
        const group =
          editingItem.group;

        const groupIds =
          group.activities.map(
            (activity) =>
              activity.id
          );

        const saveRequests =
          group.activities.map(
            async (activity) => {
              const response =
                await fetch(
                  "/api/monday",
                  {
                    method: "PUT",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body: JSON.stringify({
                      itemId:
                        activity.id,

                      expectedUpdatedAt:
                        activity.updatedAt,

                      startDate:
                        newDate,

                      startTime:
                        newStart,

                      endDate:
                        newDate,

                      endTime:
                        newEnd,

                      zone:
                        newZone,
                    }),
                  }
                );

              const data =
                await response.json();

              if (
                !response.ok ||
                data.error
              ) {
                throw new Error(
                  data.details?.[0]
                    ?.message ||
                    data.error ||
                    "Impossible de sauvegarder le groupe."
                );
              }

              return data;
            }
          );

        await Promise.all(
          saveRequests
        );

        setActivities((current) =>
          current.map((item) =>
            groupIds.includes(
              item.id
            )
              ? {
                  ...item,

                  date: newDate,

                  debut: newStart,

                  fin: newEnd,

                  zone: newZone,
                }
              : item
          )
        );

        addHistory({
          label: `Modification d'un groupe de ${group.activities.length} activités`,
          before: group.activities.map(
            (activity) => ({ ...activity })
          ),
        });
      }

      setEditingItem(null);

      setSelectedDay(newDate);

      await loadActivities(true);

      setSaveMessage(
        "✓ Modification confirmée dans Monday"
      );
    } catch (err) {
      console.error(err);

      await loadActivities(true);

      setEditError(
        err.message ||
          "Une erreur est survenue."
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteActivity(
    selectedActivity = null
  ) {
    const activity =
      selectedActivity ||
      (
        editingItem?.type === "activity"
          ? editingItem.activity
          : null
      );

    if (!activity) {
      return;
    }

    const confirmed =
      window.confirm(
        `Supprimer définitivement « ${activity.activite} » de Monday et du calendrier?`
      );

    if (!confirmed) return;

    setEditSaving(true);
    setEditError("");

    try {
      const response =
        await fetch(
          "/api/monday",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              itemId: activity.id,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.error
      ) {
        throw new Error(
          (
            Array.isArray(
              data.details
            )
              ? data.details[0]
                  ?.message
              : data.details
          ) ||
            data.error ||
            "Impossible de supprimer l'activité."
        );
      }

      setActivities((current) =>
        current.filter(
          (item) =>
            item.id !== activity.id
        )
      );

      if (
        editingItem?.type === "activity" &&
        editingItem.activity.id === activity.id
      ) {
        setEditingItem(null);
      }

      setContextMenu(null);

      setSaveMessage(
        "✓ Activité supprimée de Monday"
      );

      addHistory({
        label: `Suppression de « ${activity.activite} »`,
      });

      await loadActivities(true);
    } catch (err) {
      console.error(err);

      setEditError(
        err.message ||
          "Une erreur est survenue pendant la suppression."
      );
    } finally {
      setEditSaving(false);
    }
  }

  function handleDuplicateActivity(
    activity
  ) {
    setContextMenu(null);
    setCreateError("");
    setDuplicatingActivity(activity);

    setCreateForm({
      activite:
        `${activity.activite} - Copie`,
      date: activity.date,
      debut: activity.debut,
      fin: activity.fin,
      volet: activity.volet || "",
      zone: activity.zone || zones[0],
      status: activity.status || "",
      categorieCouleur:
        activity.categorieCouleur || "",
      notes: activity.notes || "",
    });

    setCreatingActivity(true);
  }

  function copyActivity(activity) {
    setCopiedActivity({ ...activity });
    setSaveMessage(
      `✓ « ${activity.activite} » copiée — Ctrl+V pour coller`
    );
  }

  useEffect(() => {
    function handleClipboardShortcut(event) {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const isEditingField =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            target.tagName
          )
        );

      if (isEditingField) return;

      const key = event.key.toLowerCase();

      if (
        key === "c" &&
        editingItem?.type === "activity"
      ) {
        event.preventDefault();
        copyActivity(editingItem.activity);
        setEditingItem(null);
      }

      if (key === "v" && copiedActivity) {
        event.preventDefault();
        handleDuplicateActivity(
          copiedActivity
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleClipboardShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleClipboardShortcut
      );
    };
  }, [editingItem, copiedActivity]);

  function exportActivitiesCsv() {
    const headers = [
      "ID Monday",
      "Activité",
      "Journée",
      "Date",
      "Début",
      "Fin",
      "Zone",
      "Volet",
      "Statut",
      "Catégorie couleur",
      "Notes",
    ];

    const escapeCsv = (value) =>
      `"${String(value ?? "").replaceAll(
        '"',
        '""'
      )}"`;

    const rows = activities
      .slice()
      .sort((a, b) =>
        `${a.date}-${a.debut}-${a.zone}`
          .localeCompare(
            `${b.date}-${b.debut}-${b.zone}`
          )
      )
      .map((activity) => [
        activity.mondayId,
        activity.activite,
        days.find(
          (day) => day.date === activity.date
        )?.label || "",
        activity.date,
        activity.debut,
        activity.fin,
        activity.zone,
        activity.volet,
        activity.status,
        activity.categorieCouleur,
        activity.notes,
      ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map(escapeCsv).join(";")
      )
      .join("\r\n");

    const blob = new Blob(
      [`\uFEFF${csv}`],
      { type: "text/csv;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `programmation-vita-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function loadAccessUsers() {
    setAccessError("");
    const response = await fetch(
      "/api/access-users"
    );
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(
        data.error || "Impossible de charger les accès."
      );
    }
    setAccessUsers(data.users || []);
  }

  async function openAccessManager() {
    setManagingAccess(true);
    try {
      await loadAccessUsers();
    } catch (error) {
      setAccessError(error.message);
    }
  }

  async function addAccessUser() {
    setAccessSaving(true);
    setAccessError("");
    try {
      const response = await fetch(
        "/api/access-users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(accessForm),
        }
      );
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error);
      }
      setAccessForm({
        name: "",
        email: "",
        role: "Consultation",
      });
      await loadAccessUsers();
    } catch (error) {
      setAccessError(error.message);
    } finally {
      setAccessSaving(false);
    }
  }

  async function updateAccessUser(
    accessUser,
    changes
  ) {
    setAccessSaving(true);
    setAccessError("");
    try {
      const response = await fetch(
        "/api/access-users",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemId: accessUser.id,
            role: changes.role ?? accessUser.role,
            active: changes.active ?? accessUser.active,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error);
      }
      await loadAccessUsers();
    } catch (error) {
      setAccessError(error.message);
    } finally {
      setAccessSaving(false);
    }
  }

  /*
   * ================================
   * CRÉATION D'UNE ACTIVITÉ
   * ================================
   */

  async function handleCreateActivity() {
    setCreateError("");

    const newName =
      createForm.activite.trim();

    const newDate =
      createForm.date;

    const newStart =
      createForm.debut;

    const newEnd =
      createForm.fin;

    const newZone =
      createForm.zone;

    if (!newName) {
      setCreateError(
        "Veuillez entrer le nom de l'activité."
      );
      return;
    }

    if (!newDate) {
      setCreateError(
        "Veuillez choisir une journée."
      );
      return;
    }

    if (!newStart || !newEnd) {
      setCreateError(
        "Veuillez choisir une heure de début et de fin."
      );
      return;
    }

    if (
      timeToMinutes(newEnd) <=
      timeToMinutes(newStart)
    ) {
      setCreateError(
        "L'heure de fin doit être après l'heure de début."
      );
      return;
    }

    if (!newZone) {
      setCreateError(
        "Veuillez choisir une zone."
      );
      return;
    }

    setCreateSaving(true);

    try {
      const response =
        await fetch("/api/monday", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            activite: newName,

            startDate: newDate,

            startTime: newStart,

            endDate: newDate,

            endTime: newEnd,

            jour:
              days.find(
                (day) => day.date === newDate
              )?.mondayLabel || "",
            volet: createForm.volet,
            zone: newZone,
            status: createForm.status,
            categorieCouleur:
              createForm.categorieCouleur,
            notes: createForm.notes,
          }),
        });

      const data =
        await response.json();

      if (
        !response.ok ||
        data.error
      ) {
        throw new Error(
          (
              Array.isArray(data.details)
                ? data.details[0]?.message
                : data.details
            ) ||
            data.error ||
            "Impossible de créer l'activité dans Monday."
        );
      }

      setCreatingActivity(false);

      setSelectedDay(newDate);

      setSaveMessage(
        "✓ Activité ajoutée dans Monday"
      );

      addHistory({
        label: duplicatingActivity
          ? `Duplication de « ${duplicatingActivity.activite} »`
          : `Ajout de « ${newName} »`,
      });

      setDuplicatingActivity(null);

      await loadActivities(true);
    } catch (err) {
      console.error(err);

      setCreateError(
        err.message ||
          "Une erreur est survenue lors de la création."
      );
    } finally {
      setCreateSaving(false);
    }
  }

  /*
   * ================================
   * RENDU
   * ================================
   */

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#151619] text-[#c9c9ce]">
        Vérification de la connexion…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#151619] p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-[#3a3b42] bg-[#1b1c20] p-8 text-center shadow-2xl">
          <div className="text-sm font-semibold text-[#8580d9]">
            FESTIVAL VITA 2026
          </div>
          <h1 className="mt-2 text-2xl font-semibold">
            Programmation
          </h1>
          <p className="mt-3 text-sm text-[#a1a1a8]">
            Connectez-vous avec votre compte professionnel Sports Montréal.
          </p>

          {authError && (
            <div className="mt-5 rounded-lg border border-[#df2f4a] bg-[#24171a] p-3 text-sm text-[#ff8b9a]">
              {authError}
            </div>
          )}

          <a
            href="/api/auth/login"
            className="mt-6 block rounded-lg bg-[#8580d9] px-5 py-3 font-semibold text-[#151619] hover:bg-[#9995e3]"
          >
            Se connecter avec Microsoft
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#151619] text-white">

      <datalist id="half-hour-times">
        {times.map((time) => (
          <option
            key={time}
            value={time}
          />
        ))}
      </datalist>

      {/* HEADER */}

      <header className="no-print border-b border-[#303137] bg-[#1b1c20] px-6 py-5">

        <div className="mx-auto max-w-[1800px]">

          <div className="flex items-center justify-between gap-6">

            <div>

              <div className="text-sm font-semibold text-[#8580d9]">
                FESTIVAL VITA 2026
              </div>

              <h1 className="mt-1 text-2xl font-semibold">
                Programmation
              </h1>

            </div>

            <div className="flex items-center gap-3">

              {/* BOUTON AJOUTER */}

              {canModify && (
                <>
                  <button
                    type="button"
                    onClick={openAccessManager}
                    className="rounded-md border border-[#3a3b42] bg-[#303137] px-4 py-2 text-sm font-semibold text-white hover:bg-[#404148]"
                  >
                    Gérer les accès
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openCreateEditor()
                    }
                    className="rounded-md bg-[#8580d9] px-4 py-2 text-sm font-semibold text-[#151619] transition hover:bg-[#9995e3]"
                  >
                    + Ajouter une activité
                  </button>
                </>
              )}

              <div className="flex gap-2">

                {days.map((day) => (

                  <button
                    key={day.date}
                    type="button"
                    onClick={() =>
                      setSelectedDay(
                        day.date
                      )
                    }
                    className={
                      "rounded-md px-5 py-2 text-sm font-semibold transition " +
                      (
                        selectedDay ===
                        day.date
                          ? "bg-[#8580d9] text-[#151619]"
                          : "bg-[#303137] text-white hover:bg-[#404148]"
                      )
                    }
                  >
                    {day.label}
                  </button>

                ))}

              </div>

              <div className="ml-2 border-l border-[#3a3b42] pl-4 text-right">
                <div className="text-xs font-semibold">
                  {user.name}
                </div>
                <div className="text-[11px] text-[#a1a1a8]">
                  {user.role}
                  {" · "}
                  <a
                    href="/api/auth/logout"
                    className="underline hover:text-white"
                  >
                    Déconnexion
                  </a>
                </div>
              </div>

            </div>

          </div>

        </div>

      </header>

      <section className="no-print border-b border-[#303137] bg-[#18191d] px-6 py-3">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Rechercher une activité ou un ID…"
            className="min-w-[260px] flex-1 rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2 text-sm text-white outline-none focus:border-[#8580d9]"
          />

          <select
            value={zoneFilter}
            onChange={(event) =>
              setZoneFilter(event.target.value)
            }
            className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2 text-sm text-white"
          >
            <option value="">Toutes les zones</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>

          <select
            value={voletFilter}
            onChange={(event) =>
              setVoletFilter(event.target.value)
            }
            className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2 text-sm text-white"
          >
            <option value="">Tous les volets</option>
            {[...new Set(activities.map((item) => item.volet).filter(Boolean))]
              .sort()
              .map((volet) => (
                <option key={volet} value={volet}>
                  {volet}
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2 text-sm text-white"
          >
            <option value="">Tous les statuts</option>
            {[...new Set(activities.map((item) => item.status).filter(Boolean))]
              .sort()
              .map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={() => loadActivities(true)}
            className="rounded-lg border border-[#3a3b42] bg-[#303137] px-3 py-2 text-sm text-white hover:bg-[#404148]"
          >
            Actualiser
          </button>

          <button
            type="button"
            onClick={exportActivitiesCsv}
            className="rounded-lg border border-[#3a3b42] bg-[#303137] px-3 py-2 text-sm text-white hover:bg-[#404148]"
          >
            Exporter CSV
          </button>

          <span className="text-xs text-[#8fba91]">
            ● Synchronisé{lastSyncedAt
              ? ` à ${lastSyncedAt.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "…"}
          </span>

          <details className="relative">
            <summary className="cursor-pointer rounded-lg border border-[#3a3b42] bg-[#303137] px-3 py-2 text-sm text-white hover:bg-[#404148]">
              Historique ({history.length})
            </summary>
            <div className="absolute right-0 z-[1200] mt-2 w-[360px] rounded-lg border border-[#3a3b42] bg-[#202126] p-3 shadow-2xl">
              {history.length === 0 ? (
                <div className="text-sm text-[#a1a1a8]">
                  Aucune modification dans cette session.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="border-b border-[#303137] pb-2 text-sm last:border-0">
                      <div>{entry.label}</div>
                      <div className="text-xs text-[#a1a1a8]">
                        {entry.createdAt.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoing || !history.some((entry) => entry.before?.length)}
                className="mt-3 w-full rounded-md bg-[#8580d9] px-3 py-2 text-sm font-semibold text-[#151619] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {undoing ? "Annulation…" : "Annuler la dernière modification"}
              </button>
              <div className="mt-2 text-[11px] text-[#a1a1a8]">
                L'historique est conservé pour cet onglet seulement.
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* CALENDRIER */}

      <main className="calendar-main overflow-x-auto p-6">

        {loading && (

          <div className="mx-auto max-w-[1800px] py-10 text-center text-[#a1a1a8]">
            Chargement de la programmation…
          </div>

        )}

        {error && (

          <div className="mx-auto max-w-[1800px] rounded-lg border border-[#df2f4a] bg-[#24171a] p-5 text-[#ff8b9a]">

            <div className="font-semibold">
              Erreur
            </div>

            <div className="mt-2 text-sm">
              {error}
            </div>

          </div>

        )}

        {!loading &&
          !error && (

            <>

              <div className="calendar-toolbar mx-auto mb-4 flex max-w-[1800px] items-center justify-between text-sm">

                <div className="text-[#8580d9]">
                  {
                    selectedActivities.length
                  }{" "}
                  activité
                  {selectedActivities.length !==
                  1
                    ? "s"
                    : ""}
                </div>

                <div className="flex items-center gap-4">

                  {copiedActivity && (
                    <span className="text-xs text-[#b9b6ff]">
                      Copié : {copiedActivity.activite}
                    </span>
                  )}

                  <div className="flex overflow-hidden rounded-lg border border-[#8580d9] bg-[#24233a]">
                    <button
                      type="button"
                      onClick={() =>
                        handlePrint("selected")
                      }
                      className="px-3 py-2 text-sm font-semibold text-[#b9b6ff] hover:bg-[#302e4d]"
                    >
                      Imprimer cette journée
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handlePrint("all")
                      }
                      className="border-l border-[#8580d9] px-3 py-2 text-sm font-semibold text-[#b9b6ff] hover:bg-[#302e4d]"
                    >
                      Les 4 jours
                    </button>
                  </div>

                  {saving && (
                    <span className="text-[#d9ad7c]">
                      Sauvegarde…
                    </span>
                  )}

                  {!saving &&
                    saveMessage && (
                      <span className="text-[#8fba91]">
                        {saveMessage}
                      </span>
                    )}

                  <div className="flex items-center gap-2 rounded-lg border border-[#303137] bg-[#1b1c20] px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarZoom(
                          (current) =>
                            Math.max(
                              40,
                              current - 10
                            )
                        )
                      }
                      className="rounded px-2 py-0.5 text-base text-[#c9c9ce] hover:bg-[#303137] hover:text-white"
                      aria-label="Dézoomer"
                    >
                      −
                    </button>

                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="5"
                      value={calendarZoom}
                      onChange={(event) =>
                        setCalendarZoom(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="w-24 accent-[#8580d9]"
                      aria-label="Zoom du calendrier"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setCalendarZoom(
                          (current) =>
                            Math.min(
                              100,
                              current + 10
                            )
                        )
                      }
                      className="rounded px-2 py-0.5 text-base text-[#c9c9ce] hover:bg-[#303137] hover:text-white"
                      aria-label="Zoomer"
                    >
                      +
                    </button>

                    <span className="w-10 text-right text-xs text-[#a1a1a8]">
                      {calendarZoom}%
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCalendarZoom(40)
                      }
                      className="ml-1 rounded-md bg-[#303137] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#404148]"
                    >
                      Vue d’ensemble
                    </button>
                  </div>

                  <span className="text-[#777980]">
                    Clic = modifier •
                    Glissez-déposez =
                    déplacer • Clic vide =
                    ajouter
                  </span>

                </div>

              </div>

              <div
                className="calendar-grid mx-auto grid min-w-[1400px] max-w-[1800px]"
                style={{
                  gridTemplateColumns:
                    "80px repeat(7, minmax(180px, 1fr))",
                  zoom:
                    calendarZoom / 100,
                }}
              >

                {/* EN-TÊTES DES ZONES */}

                <div className="border-b border-r border-[#303137] bg-[#151619]" />

                {zones.map((zone) => (

                  <div
                    key={zone}
                    className="border-b border-r border-[#303137] bg-[#1b1c20] px-3 py-4 text-center"
                  >

                    <div
                      className="mx-auto mb-2 h-1 w-10 rounded-full"
                      style={{
                        backgroundColor:
                          zoneColors[
                            zone
                          ].border,
                      }}
                    />

                    <div className="text-sm font-semibold">
                      {zone}
                    </div>

                  </div>

                ))}

                {/* CRÉNEAUX */}

                {times.map((time) => (

                  <React.Fragment
                    key={time}
                  >

                    {/* HEURE */}

                    <div className="flex h-[42px] items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#a1a1a8]">
                      {time}
                    </div>

                    {/* ZONES */}

                    {zones.map(
                      (zone) => {

                        const groupsHere =
                          activityGroups.filter(
                            (group) =>
                              group.zone ===
                                zone &&
                              getGroupTimeSlot(
                                group
                              ) ===
                                time
                          );

                        const isPreview =
                          draggedGroup &&
                          dragPreview &&
                          dragPreview.zone ===
                            zone &&
                          dragPreview.time ===
                            time;

                        return (

                          <div
                            key={`${time}-${zone}`}
                            data-time={time}
                            data-zone={zone}
                            onClick={() => {

                              if (
                                groupsHere.length ===
                                0
                              ) {
                                openCreateEditor(
                                  time,
                                  zone
                                );
                              }
                            }}
                            onDragOver={(
                              event
                            ) => {
                              event.preventDefault();

                              updateDragPreview(
                                event
                              );
                            }}
                            onDrop={
                              handleDrop
                            }
                            className={
                              "relative h-[42px] border-b border-r border-[#303137] bg-[#151619] transition " +
                              (
                                groupsHere.length ===
                                0
                                  ? "cursor-pointer hover:bg-[#1d1e23]"
                                  : ""
                              )
                            }
                          >

                            {/* PREVIEW DRAG */}

                            {isPreview && (

                              <div
                                className="pointer-events-none absolute left-1 right-1 top-1 z-[999] rounded-md border-2 border-dashed border-white bg-white/20 shadow-lg"
                                style={{
                                  height:
                                    draggedGroup
                                      ? getGroupHeight(
                                          draggedGroup
                                        )
                                      : 40,
                                }}
                              >

                                <div className="px-2 py-1 text-[10px] font-semibold text-white">
                                  {dragPreview.time}
                                </div>

                              </div>

                            )}

                            {/* ACTIVITÉS */}

                            {groupsHere.map(
                              (group) => {

                                const groupColor =
                                  getActivityColor(
                                    group
                                      .activities[0]
                                  );

                                const isSingleActivity =
                                  group
                                    .activities
                                    .length ===
                                  1;

                                return (

                                  <div
                                    key={
                                      group.id
                                    }
                                    draggable
                                    onDragStart={() =>
                                      handleDragStart(
                                        group
                                      )
                                    }
                                    onDragEnd={
                                      handleDragEnd
                                    }
                                    onClick={(
                                      event
                                    ) => {

                                      event.stopPropagation();

                                      if (
                                        draggedGroup
                                      ) {
                                        return;
                                      }

                                      if (
                                        isSingleActivity
                                      ) {
                                        openActivityEditor(
                                          group
                                            .activities[0]
                                        );
                                      } else {
                                        openGroupEditor(
                                          group
                                        );
                                      }
                                    }}
                                    onContextMenu={(
                                      event
                                    ) =>
                                      openActivityContextMenu(
                                        event,
                                        group
                                      )
                                    }
                                    className={
                                      "absolute left-1 right-1 z-20 cursor-grab overflow-hidden rounded-md border-2 p-2 text-xs font-semibold text-[#202124] shadow-lg transition-shadow hover:shadow-xl active:cursor-grabbing " +
                                      (
                                        draggedGroup?.id ===
                                        group.id
                                          ? "opacity-40"
                                          : ""
                                      )
                                    }
                                    style={{
                                      top:
                                        getGroupTopOffset(
                                          group
                                        ),

                                      height:
                                        getGroupHeight(
                                          group
                                        ),

                                      backgroundColor:
                                        groupColor.background,

                                      borderColor:
                                        groupColor.border,
                                    }}
                                    title={
                                      isSingleActivity
                                        ? "Cliquer pour modifier • Glisser pour déplacer"
                                        : "Cliquer pour modifier le groupe • Glisser pour déplacer"
                                    }
                                  >

                                    <div className="space-y-0.5">

                                      {group.activities.map(
                                        (
                                          activity
                                        ) => (

                                          <div
                                            key={
                                              activity.id
                                            }
                                            className="flex items-start gap-1"
                                          >

                                            <span className="opacity-60">
                                              •
                                            </span>

                                            <span>
                                              {
                                                activity.activite
                                              }
                                            </span>

                                          </div>

                                        )
                                      )}

                                    </div>

                                    <div className="mt-1 text-[10px] font-medium opacity-70">

                                      {
                                        group.debut
                                      }{" "}
                                      –{" "}
                                      {
                                        group.fin
                                      }

                                    </div>

                                  </div>

                                );
                              }
                            )}

                          </div>

                        );
                      }
                    )}

                  </React.Fragment>

                ))}

              </div>

            </>

          )}

      </main>

      <div className="print-document">
        {(printScope === "all"
          ? days
          : days.filter(
              (day) =>
                day.date === selectedDay
            )
        ).map((day) => {
          const printGroups =
            getPrintGroups(day.date);

          return (
            <section
              key={day.date}
              className="print-page"
            >
              <div className="print-page-title">
                <div>FESTIVAL VITA 2026</div>
                <h1>
                  Programmation — {day.label}
                </h1>
              </div>

              <div className="print-zone-headings">
                <div />
                {zones.map((zone) => (
                  <div key={zone}>
                    {zone}
                  </div>
                ))}
              </div>

              <div className="print-schedule">
                <div className="print-time-axis">
                  {[
                    "05:30", "06:00", "07:00",
                    "08:00", "09:00", "10:00",
                    "11:00", "12:00", "13:00",
                    "14:00", "15:00", "16:00",
                    "17:00", "18:00", "19:00",
                    "20:00", "21:00", "22:00",
                    "23:00", "23:30", "24:00",
                  ].map((time) => (
                    <span
                      key={time}
                      style={{
                        top:
                          `${(((time === "24:00" ? 1440 : timeToMinutes(time)) - 330) / 1110) * 100}%`,
                      }}
                    >
                      {time}
                    </span>
                  ))}
                </div>

                {zones.map((zone) => (
                  <div
                    key={zone}
                    className="print-zone-lane"
                  >
                    {printGroups
                      .filter(
                        (group) =>
                          group.zone === zone
                      )
                      .map((group) => {
                        const start =
                          timeToMinutes(
                            group.debut
                          );
                        const end =
                          timeToMinutes(
                            group.fin
                          );
                        const color =
                          getActivityColor(
                            group.activities[0]
                          );

                        return (
                          <div
                            key={`${zone}-${group.debut}-${group.fin}`}
                            className="print-activity"
                            style={{
                              top:
                                `${((start - 330) / 1110) * 100}%`,
                              height:
                                `${Math.max(((end - start) / 1110) * 100, 0.8)}%`,
                              backgroundColor:
                                color.background,
                              borderColor:
                                color.border,
                            }}
                          >
                            <strong>
                              {group.activities
                                .map(
                                  (activity) =>
                                    activity.activite
                                )
                                .join(" • ")}
                            </strong>
                            <span>
                              {group.debut}–{group.fin}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {contextMenu && (
        <div
          className="fixed z-[3000] w-[280px] rounded-lg border border-[#3a3b42] bg-[#202126] p-2 text-white shadow-2xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) =>
            event.stopPropagation()
          }
          onContextMenu={(event) =>
            event.preventDefault()
          }
        >
          {contextMenu.activities.map(
            (activity) => (
              <div
                key={activity.id}
                className="border-b border-[#303137] p-2 last:border-0"
              >
                <div className="mb-2 truncate text-xs font-semibold text-[#d8d8dc]">
                  {activity.activite}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      copyActivity(activity);
                      setContextMenu(null);
                    }}
                    className="rounded-md border border-[#8580d9] bg-[#24233a] px-2 py-2 text-xs font-semibold text-[#b9b6ff] hover:bg-[#302e4d]"
                  >
                    Copier
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDuplicateActivity(
                        activity
                      )
                    }
                    className="rounded-md bg-[#8580d9] px-3 py-2 text-xs font-semibold text-[#151619] hover:bg-[#9995e3]"
                  >
                    Dupliquer
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteActivity(
                        activity
                      )
                    }
                    className="rounded-md border border-[#df2f4a] bg-[#24171a] px-3 py-2 text-xs font-semibold text-[#ff8b9a] hover:bg-[#351b20]"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {managingAccess && canModify && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#3a3b42] bg-[#1b1c20] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-[#8580d9]">
                  Administration
                </div>
                <h2 className="text-xl font-semibold">
                  Accès au calendrier
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setManagingAccess(false)}
                className="rounded px-2 py-1 text-xl text-[#a1a1a8] hover:bg-[#303137] hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-2 rounded-lg border border-[#303137] bg-[#151619] p-3 md:grid-cols-[1fr_1.4fr_160px_auto]">
              <input
                value={accessForm.name}
                onChange={(event) => setAccessForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nom complet"
                className="rounded border border-[#3a3b42] bg-[#202126] px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={accessForm.email}
                onChange={(event) => setAccessForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="courriel@sportsmontreal.com"
                className="rounded border border-[#3a3b42] bg-[#202126] px-3 py-2 text-sm"
              />
              <select
                value={accessForm.role}
                onChange={(event) => setAccessForm((current) => ({ ...current, role: event.target.value }))}
                className="rounded border border-[#3a3b42] bg-[#202126] px-3 py-2 text-sm"
              >
                <option>Consultation</option>
                <option>Modification</option>
              </select>
              <button
                type="button"
                onClick={addAccessUser}
                disabled={accessSaving}
                className="rounded bg-[#8580d9] px-4 py-2 text-sm font-semibold text-[#151619] disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>

            {accessError && (
              <div className="mb-4 rounded border border-[#df2f4a] bg-[#24171a] p-3 text-sm text-[#ff8b9a]">
                {accessError}
              </div>
            )}

            <div className="space-y-2">
              {accessUsers.map((accessUser) => (
                <div key={accessUser.id} className="grid grid-cols-[1fr_1.4fr_160px_110px] items-center gap-2 rounded-lg border border-[#303137] p-3 text-sm">
                  <div className="font-semibold">{accessUser.name}</div>
                  <div className="truncate text-[#a1a1a8]">{accessUser.email}</div>
                  <select
                    value={accessUser.role}
                    disabled={accessSaving}
                    onChange={(event) => updateAccessUser(accessUser, { role: event.target.value })}
                    className="rounded border border-[#3a3b42] bg-[#151619] px-2 py-1.5"
                  >
                    <option>Consultation</option>
                    <option>Modification</option>
                  </select>
                  <button
                    type="button"
                    disabled={accessSaving}
                    onClick={() => updateAccessUser(accessUser, { active: accessUser.active === "Oui" ? "Non" : "Oui" })}
                    className={"rounded px-3 py-1.5 font-semibold " + (accessUser.active === "Oui" ? "bg-[#29402c] text-[#9bd2a0]" : "bg-[#40272b] text-[#ff9aa6]")}
                  >
                    {accessUser.active === "Oui" ? "Actif" : "Inactif"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          POPUP D'ÉDITION
          ================================================== */}

      {editingItem && (

        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditor();
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#3a3b42] bg-[#1b1c20] p-6 shadow-2xl">

            <div className="mb-6 flex items-start justify-between">

              <div>

                <div className="text-xs font-semibold uppercase tracking-wide text-[#8580d9]">
                  {
                    editingItem.type ===
                    "group"
                      ? "Modifier le groupe"
                      : "Modifier l'activité"
                  }
                </div>

                <h2 className="mt-1 text-xl font-semibold">
                  {
                    editingItem.type ===
                    "group"
                      ? `${editingItem.group.activities.length} activités`
                      : "Détails de l'activité"
                  }
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeEditor
                }
                disabled={editSaving}
                className="rounded-md px-2 py-1 text-xl text-[#85858c] hover:bg-[#303137] hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="space-y-5">

              {editingItem.type ===
                "activity" && (

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                    Activité
                  </label>

                  <input
                    type="text"
                    value={
                      editForm.activite
                    }
                    onChange={(
                      event
                    ) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          activite:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#8580d9]"
                  />

                </div>

              )}

              {editingItem.type ===
                "group" && (

                <div className="rounded-lg border border-[#303137] bg-[#151619] p-3">

                  <div className="mb-2 text-xs font-medium text-[#85858c]">
                    ACTIVITÉS DU GROUPE
                  </div>

                  <div className="max-h-40 space-y-1 overflow-y-auto pr-2">

                    {editingItem.group.activities.map(
                      (activity) => (

                        <div
                          key={
                            activity.id
                          }
                          className="text-sm text-[#e4e4e7]"
                        >
                          •{" "}
                          {
                            activity.activite
                          }
                        </div>

                      )
                    )}

                  </div>

                </div>

              )}

              <div>

                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Journée
                </label>

                <select
                  value={
                    editForm.date
                  }
                  onChange={(
                    event
                  ) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        date:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                >

                  {days.map(
                    (day) => (

                      <option
                        key={
                          day.date
                        }
                        value={
                          day.date
                        }
                      >
                        {day.label}
                      </option>

                    )
                  )}

                </select>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                    Heure de début
                  </label>

                  <input
                    type="time"
                    step="60"
                    list="half-hour-times"
                    value={
                      editForm.debut
                    }
                    onChange={(
                      event
                    ) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          debut:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                    Heure de fin
                  </label>

                  <input
                    type="time"
                    step="60"
                    list="half-hour-times"
                    value={
                      editForm.fin
                    }
                    onChange={(
                      event
                    ) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          fin:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                  />

                </div>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Zone
                </label>

                <select
                  value={
                    editForm.zone
                  }
                  onChange={(
                    event
                  ) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        zone:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                >

                  {zones.map(
                    (zone) => (

                      <option
                        key={zone}
                        value={zone}
                      >
                        {zone}
                      </option>

                    )
                  )}

                </select>

              </div>

              {editError && (

                <div className="rounded-lg border border-[#df2f4a] bg-[#24171a] p-3 text-sm text-[#ff8b9a]">
                  {editError}
                </div>

              )}

            </div>

            <div className="mt-7 flex items-center justify-between gap-3">

              <div>
                {editingItem.type ===
                  "activity" && (
                  <button
                    type="button"
                    onClick={
                      () =>
                        handleDeleteActivity()
                    }
                    disabled={editSaving}
                    className="rounded-lg border border-[#df2f4a] bg-[#24171a] px-5 py-2.5 text-sm font-semibold text-[#ff8b9a] transition hover:bg-[#351b20] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {editSaving
                      ? "Traitement…"
                      : "Supprimer l'activité"}
                  </button>
                )}
              </div>

              <div className="flex gap-3">

              <button
                type="button"
                onClick={
                  closeEditor
                }
                disabled={editSaving}
                className="rounded-lg border border-[#3a3b42] bg-[#303137] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#404148] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={
                  handleSaveEditor
                }
                disabled={
                  editSaving
                }
                className="rounded-lg bg-[#8580d9] px-5 py-2.5 text-sm font-semibold text-[#151619] transition hover:bg-[#9995e3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editSaving
                  ? "Enregistrement…"
                  : "Enregistrer"}
              </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* ==================================================
          POPUP AJOUT D'ACTIVITÉ
          ================================================== */}

      {creatingActivity && (

        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateEditor();
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#3a3b42] bg-[#1b1c20] p-6 shadow-2xl">

            <div className="mb-6 flex items-start justify-between">

              <div>

                <div className="text-xs font-semibold uppercase tracking-wide text-[#8580d9]">
                  {duplicatingActivity
                    ? "Copie d'une activité"
                    : "Nouvelle activité"}
                </div>

                <h2 className="mt-1 text-xl font-semibold">
                  {duplicatingActivity
                    ? "Modifier la copie avant de l'ajouter"
                    : "Ajouter une activité"}
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeCreateEditor
                }
                disabled={
                  createSaving
                }
                className="rounded-md px-2 py-1 text-xl text-[#85858c] hover:bg-[#303137] hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="space-y-5">

              {/* NOM */}

              <div>

                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Activité
                </label>

                <input
                  type="text"
                  autoFocus
                  placeholder="Nom de l'activité"
                  value={
                    createForm.activite
                  }
                  onChange={(
                    event
                  ) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        activite:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-[#606168] focus:border-[#8580d9]"
                />

              </div>

              {/* JOURNÉE */}

              <div>

                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Journée
                </label>

                <select
                  value={
                    createForm.date
                  }
                  onChange={(
                    event
                  ) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        date:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                >

                  {days.map(
                    (day) => (

                      <option
                        key={
                          day.date
                        }
                        value={
                          day.date
                        }
                      >
                        {day.label}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* HEURES */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                    Heure de début
                  </label>

                  <input
                    type="time"
                    step="60"
                    list="half-hour-times"
                    value={
                      createForm.debut
                    }
                    onChange={(
                      event
                    ) =>
                      setCreateForm(
                        (current) => ({
                          ...current,
                          debut:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                    Heure de fin
                  </label>

                  <input
                    type="time"
                    step="60"
                    list="half-hour-times"
                    value={
                      createForm.fin
                    }
                    onChange={(
                      event
                    ) =>
                      setCreateForm(
                        (current) => ({
                          ...current,
                          fin:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                  />

                </div>

              </div>

              {/* ZONE */}

              <div>

                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Zone
                </label>

                <select
                  value={
                    createForm.zone
                  }
                  onChange={(
                    event
                  ) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        zone:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                >

                  {zones.map(
                    (zone) => (

                      <option
                        key={zone}
                        value={zone}
                      >
                        {zone}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* AUTRES COLONNES MONDAY */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Volet
                </label>
                <select
                  value={createForm.volet}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      volet: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                >
                  <option value="">
                    Sélectionner…
                  </option>
                  {(mondayColumnOptions["dropdown_mm63ffn6"]?.options || []).map(
                    (option) => (
                      <option
                        key={option.id}
                        value={option.label}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Statut
                </label>
                <select
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                >
                  <option value="">
                    Sélectionner…
                  </option>
                  {(mondayColumnOptions["status"]?.options || []).map(
                    (option) => (
                      <option
                        key={option.id}
                        value={option.label}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Catégorie couleur
                </label>
                <select
                  value={createForm.categorieCouleur}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      categorieCouleur: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                >
                  <option value="">
                    Sélectionner…
                  </option>
                  {(mondayColumnOptions["color_mm63ahs6"]?.options || []).map(
                    (option) => (
                      <option
                        key={option.id}
                        value={option.label}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={createForm.notes}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="w-full resize-y rounded-lg border border-[#3a3b42] bg-[#151619] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8580d9]"
                />
              </div>

              {/* ERREUR */}

              {createError && (

                <div className="rounded-lg border border-[#df2f4a] bg-[#24171a] p-3 text-sm text-[#ff8b9a]">
                  {createError}
                </div>

              )}

            </div>

            {/* BOUTONS */}

            <div className="mt-7 flex justify-end gap-3">

              <button
                type="button"
                onClick={
                  closeCreateEditor
                }
                disabled={
                  createSaving
                }
                className="rounded-lg border border-[#3a3b42] bg-[#303137] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#404148] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={
                  handleCreateActivity
                }
                disabled={
                  createSaving
                }
                className="rounded-lg bg-[#8580d9] px-5 py-2.5 text-sm font-semibold text-[#151619] transition hover:bg-[#9995e3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createSaving
                  ? "Création…"
                  : "Ajouter l'activité"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;
