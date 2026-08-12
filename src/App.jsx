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
  { label: "Jeudi", date: "2026-09-17" },
  { label: "Vendredi", date: "2026-09-18" },
  { label: "Samedi", date: "2026-09-19" },
  { label: "Dimanche", date: "2026-09-20" },
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
  mode: "dropdown_mm63xxam",
  status: "status",
  affichage: "text_mm5zme5q",
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

  if (!column) return "";

  try {
    const value = column.value
      ? JSON.parse(column.value)
      : null;

    if (value?.date) return value.date;
  } catch (error) {
    console.warn("Date Monday invalide:", column.value);
  }

  const match = (column.text || "").match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  return match ? match[1] : "";
}

function getTime(item, columnId) {
  const column = item.column_values?.find(
    (col) => col.id === columnId
  );

  if (!column) return "";

  try {
    const value = column.value
      ? JSON.parse(column.value)
      : null;

    if (value?.time) {
      return value.time.substring(0, 5);
    }
  } catch (error) {
    console.warn("Heure Monday invalide:", column.value);
  }

  const match = (column.text || "").match(
    /(\d{2}:\d{2})(?::\d{2})?$/
  );

  return match ? match[1] : "";
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
  const [selectedDay, setSelectedDay] =
    useState("2026-09-18");

  const [activities, setActivities] =
    useState([]);

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

  const [createForm, setCreateForm] =
    useState({
      activite: "",
      date: "",
      debut: "",
      fin: "",
      zone: "",
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

  async function loadActivities() {
    try {
      setLoading(true);

      const response =
        await fetch("/api/monday");

      const data =
        await response.json();

      if (
        !response.ok ||
        data.error
      ) {
        throw new Error(
          data.details?.[0]?.message ||
            data.error ||
            "Impossible de charger les données."
        );
      }

      const items =
        data.data?.boards?.[0]
          ?.items_page?.items || [];

      const formattedActivities =
        items
          .map((item) => ({
            id: item.id,

            mondayId: item.name,

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

            mode: getColumn(
              item,
              COLUMN_IDS.mode
            ),

            status: getColumn(
              item,
              COLUMN_IDS.status
            ),

            affichage: getColumn(
              item,
              COLUMN_IDS.affichage
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

      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  }, []);

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
      return activities.filter(
        (activity) =>
          activity.date === selectedDay
      );
    }, [
      activities,
      selectedDay,
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
      (duration / 30) * 45 - 4,
      34
    );
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
      relativeY >= 22.5
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
                data.details?.[0]
                  ?.message ||
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

      setSaveMessage(
        "✓ Modification enregistrée dans Monday"
      );
    } catch (err) {
      console.error(err);

      setSaveMessage(
        "⚠️ Le changement est affiché, mais la sauvegarde dans Monday a échoué."
      );

      await loadActivities();
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

  /*
   * ================================
   * OUVERTURE DU POPUP AJOUT
   * ================================
   */

  function openCreateEditor(
    time = "05:30",
    zone = zones[0]
  ) {
    setCreateError("");

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
      zone: zone,
    });

    setCreatingActivity(true);
  }

  function closeCreateEditor() {
    if (createSaving) return;

    setCreatingActivity(false);
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
      }

      setEditingItem(null);

      setSelectedDay(newDate);

      setSaveMessage(
        "✓ Modification enregistrée dans Monday"
      );
    } catch (err) {
      console.error(err);

      setEditError(
        err.message ||
          "Une erreur est survenue."
      );
    } finally {
      setEditSaving(false);
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

            zone: newZone,
          }),
        });

      const data =
        await response.json();

      if (
        !response.ok ||
        data.error
      ) {
        throw new Error(
          data.details?.[0]?.message ||
            data.error ||
            "Impossible de créer l'activité dans Monday."
        );
      }

      setCreatingActivity(false);

      setSelectedDay(newDate);

      setSaveMessage(
        "✓ Activité ajoutée dans Monday"
      );

      await loadActivities();
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

  return (
    <div className="min-h-screen bg-[#151619] text-white">

      {/* HEADER */}

      <header className="border-b border-[#303137] bg-[#1b1c20] px-6 py-5">

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

              <button
                type="button"
                onClick={() =>
                  openCreateEditor()
                }
                className="rounded-md bg-[#8580d9] px-4 py-2 text-sm font-semibold text-[#151619] transition hover:bg-[#9995e3]"
              >
                + Ajouter une activité
              </button>

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

            </div>

          </div>

        </div>

      </header>

      {/* CALENDRIER */}

      <main className="overflow-x-auto p-6">

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

              <div className="mx-auto mb-4 flex max-w-[1800px] items-center justify-between text-sm">

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

                  <span className="text-[#777980]">
                    Clic = modifier •
                    Glissez-déposez =
                    déplacer • Clic vide =
                    ajouter
                  </span>

                </div>

              </div>

              <div
                className="mx-auto grid min-w-[1400px] max-w-[1800px]"
                style={{
                  gridTemplateColumns:
                    "80px repeat(7, minmax(180px, 1fr))",
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

                    <div className="flex h-[45px] items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#a1a1a8]">
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
                              group.debut ===
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
                              "relative h-[45px] border-b border-r border-[#303137] bg-[#151619] transition " +
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
                                    className={
                                      "absolute left-1 right-1 top-1 z-20 cursor-grab overflow-hidden rounded-md border-2 p-2 text-xs font-semibold text-[#202124] shadow-lg transition-shadow hover:shadow-xl active:cursor-grabbing " +
                                      (
                                        draggedGroup?.id ===
                                        group.id
                                          ? "opacity-40"
                                          : ""
                                      )
                                    }
                                    style={{
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

                  <select
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
                  >

                    {times.map(
                      (time) => (

                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>

                      )
                    )}

                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                    Heure de fin
                  </label>

                  <select
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
                  >

                    {times.map(
                      (time) => (

                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>

                      )
                    )}

                  </select>

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

            <div className="mt-7 flex justify-end gap-3">

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
                  Nouvelle activité
                </div>

                <h2 className="mt-1 text-xl font-semibold">
                  Ajouter une activité
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

                  <select
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
                  >

                    {times.map(
                      (time) => (

                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>

                      )
                    )}

                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#c9c9ce]">
                    Heure de fin
                  </label>

                  <select
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
                  >

                    {times.map(
                      (time) => (

                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>

                      )
                    )}

                  </select>

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
