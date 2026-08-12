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

  /*
   * Monday nous renvoie une heure décalée d'une heure.
   * On retire donc 1 heure pour retrouver l'heure
   * affichée dans notre programmation.
   */
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
   * ------------------------------------------------
   * ZOOM DU CALENDRIER
   * ------------------------------------------------
   *
   * 100 % = 45 px par tranche de 30 minutes.
   *
   * 60 % = 27 px
   * 70 % = 31.5 px
   * 80 % = 36 px
   * 90 % = 40.5 px
   * 100 % = 45 px
   * 110 % = 49.5 px
   * 120 % = 54 px
   */

  const [zoom, setZoom] = useState(100);

  const zoomScale = zoom / 100;

  const rowHeight = 45 * zoomScale;

  const timeColumnWidth = 80 * zoomScale;

  const zoneColumnWidth = 180 * zoomScale;

  const calendarFontSize =
    Math.max(9, 12 * zoomScale);

  const zoneHeaderFontSize =
    Math.max(9, 14 * zoomScale);

  /*
   * ------------------------------------------------
   * POPUP
   * ------------------------------------------------
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
   * ------------------------------------------------
   * CHARGEMENT MONDAY
   * ------------------------------------------------
   */

  async function loadActivities() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/monday"
      );

      const data =
        await response.json();

      if (!response.ok || data.error) {
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
   * ------------------------------------------------
   * AUTO-SCROLL PENDANT LE DRAG
   * ------------------------------------------------
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
          1 -
          mouseY / edgeSize;

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
   * ------------------------------------------------
   * ACTIVITÉS DU JOUR
   * ------------------------------------------------
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
   * ------------------------------------------------
   * GROUPES
   * ------------------------------------------------
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

    /*
     * 45 px à 100 %.
     * Le zoom est appliqué directement
     * à la hauteur réelle du bloc.
     */
    return Math.max(
      (duration / 30) *
        rowHeight -
        4 * zoomScale,
      34 * zoomScale
    );
  }

  /*
   * ------------------------------------------------
   * DRAG & DROP
   * ------------------------------------------------
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

    /*
     * On utilise maintenant la moitié
     * de la hauteur réelle de la cellule.
     *
     * Donc ça fonctionne également
     * lorsque le zoom est modifié.
     */
    const half =
      relativeY >=
      rect.height / 2
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
        (activity) =>
          activity.id
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
   * ------------------------------------------------
   * OUVERTURE DU POPUP
   * ------------------------------------------------
   */

  function openActivityEditor(
    activity
  ) {
    setEditError("");

    setEditingItem({
      type: "activity",
      activity,
    });

    setEditForm({
      activite:
        activity.activite || "",

      date:
        activity.date ||
        selectedDay,

      debut:
        activity.debut ||
        "05:30",

      fin:
        activity.fin ||
        "06:00",

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
        group.date ||
        selectedDay,

      debut:
        group.debut ||
        "05:30",

      fin:
        group.fin ||
        "06:00",

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
   * ------------------------------------------------
   * SAUVEGARDE DU POPUP
   * ------------------------------------------------
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

      if (
        !newStart ||
        !newEnd
      ) {
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
                itemId:
                  activity.id,

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
              "Impossible de sauvegarder la modification."
          );
        }

        setActivities((current) =>
          current.map((item) =>
            item.id ===
            activity.id
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
   * ------------------------------------------------
   * RENDU
   * ------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-[#151619] text-white">

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

              {/* JOURS */}

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

              {/* ZOOM */}

              <div className="flex items-center rounded-lg border border-[#303137] bg-[#151619] p-1">

                <button
                  type="button"
                  onClick={() =>
                    setZoom(
                      (current) =>
                        Math.max(
                          60,
                          current - 10
                        )
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-white transition hover:bg-[#303137]"
                  title="Dézoomer"
                >
                  −
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setZoom(100)
                  }
                  className="min-w-[52px] rounded-md px-2 py-1.5 text-xs font-semibold text-[#a1a1a8] transition hover:bg-[#303137] hover:text-white"
                  title="Réinitialiser le zoom"
                >
                  {zoom}%
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setZoom(
                      (current) =>
                        Math.min(
                          120,
                          current + 10
                        )
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-white transition hover:bg-[#303137]"
                  title="Zoomer"
                >
                  +
                </button>

              </div>

            </div>

          </div>

        </div>

      </header>

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
                    déplacer
                  </span>

                </div>

              </div>

              {/* CALENDRIER */}

              <div
                className="mx-auto"
                style={{
                  minWidth: `${
                    timeColumnWidth +
                    zoneColumnWidth *
                      zones.length
                  }px`,
                }}
              >

                <div
                  className="grid"
                  style={{
                    gridTemplateColumns:
                      `${timeColumnWidth}px repeat(${zones.length}, ${zoneColumnWidth}px)`,
                  }}
                >

                  {/* CELLULE VIDE AU-DESSUS DES HEURES */}

                  <div
                    className="border-b border-r border-[#303137] bg-[#151619]"
                    style={{
                      height: `${60 * zoomScale}px`,
                    }}
                  />

                  {/* NOMS DES ZONES */}

                  {zones.map((zone) => (

                    <div
                      key={zone}
                      className="border-b border-r border-[#303137] bg-[#1b1c20] text-center"
                      style={{
                        height: `${60 * zoomScale}px`,
                        padding:
                          `${12 * zoomScale}px ${8 * zoomScale}px`,
                      }}
                    >

                      <div
                        className="mx-auto rounded-full"
                        style={{
                          width: `${40 * zoomScale}px`,
                          height: `${4 * zoomScale}px`,
                          marginBottom: `${8 * zoomScale}px`,
                          backgroundColor:
                            zoneColors[
                              zone
                            ].border,
                        }}
                      />

                      <div
                        className="font-semibold"
                        style={{
                          fontSize: `${zoneHeaderFontSize}px`,
                        }}
                      >
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

                      <div
                        className="flex items-center justify-end border-b border-r border-[#303137] bg-[#151619] text-[#a1a1a8]"
                        style={{
                          height: `${rowHeight}px`,
                          paddingRight: `${12 * zoomScale}px`,
                          fontSize: `${Math.max(
                            9,
                            12 * zoomScale
                          )}px`,
                        }}
                      >
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
                              data-time={
                                time
                              }
                              data-zone={
                                zone
                              }
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
                              className="relative border-b border-r border-[#303137] bg-[#151619]"
                              style={{
                                height: `${rowHeight}px`,
                              }}
                            >

                              {/* APERÇU DE DROP */}

                              {isPreview && (

                                <div
                                  className="pointer-events-none absolute left-1 right-1 top-1 z-[999] rounded-md border-2 border-dashed border-white bg-white/20 shadow-lg"
                                  style={{
                                    height:
                                      draggedGroup
                                        ? getGroupHeight(
                                            draggedGroup
                                          )
                                        : rowHeight -
                                          4 *
                                            zoomScale,
                                  }}
                                >

                                  <div
                                    className="font-semibold text-white"
                                    style={{
                                      padding: `${4 * zoomScale}px ${8 * zoomScale}px`,
                                      fontSize: `${Math.max(
                                        8,
                                        10 *
                                          zoomScale
                                      )}px`,
                                    }}
                                  >
                                    {
                                      dragPreview.time
                                    }
                                  </div>

                                </div>

                              )}

                              {/* GROUPES */}

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
                                        "absolute left-1 right-1 top-1 z-20 cursor-grab overflow-hidden rounded-md border-2 font-semibold text-[#202124] shadow-lg transition-shadow hover:shadow-xl active:cursor-grabbing " +
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

                                        padding: `${8 * zoomScale}px`,

                                        backgroundColor:
                                          groupColor.background,

                                        borderColor:
                                          groupColor.border,

                                        fontSize: `${calendarFontSize}px`,
                                      }}
                                      title={
                                        isSingleActivity
                                          ? "Cliquer pour modifier • Glisser pour déplacer"
                                          : "Cliquer pour modifier le groupe • Glisser pour déplacer"
                                      }
                                    >

                                      <div
                                        className="space-y-0.5"
                                      >

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

                                      <div
                                        className="font-medium opacity-70"
                                        style={{
                                          marginTop: `${4 * zoomScale}px`,
                                          fontSize: `${Math.max(
                                            8,
                                            10 *
                                              zoomScale
                                          )}px`,
                                        }}
                                      >
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

              </div>

            </>

          )}

      </main>

      {/* POPUP D'ÉDITION */}

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
                            event
                              .target
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
                          event
                            .target
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
                            event
                              .target
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
                            event
                              .target
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
                          event
                            .target
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

    </div>
  );
}

export default App;
