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

  useEffect(() => {
    async function loadActivities() {
      try {
        setLoading(true);

        const response = await fetch(
          "/api/monday"
        );

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(
            data.details?.[0]?.message ||
              data.error ||
              "Impossible de charger les données."
          );
        }

        const items =
          data.data?.boards?.[0]?.items_page
            ?.items || [];

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

    loadActivities();
  }, []);

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
      (duration / 30) * 56 - 4,
      42
    );
  }

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

  /*
   * Calcule l'heure en fonction de la position
   * exacte de la souris dans la colonne.
   */
  function getDropTimeFromMouse(event) {
    const cell =
      event.currentTarget;

    const rect =
      cell.getBoundingClientRect();

    const y =
      event.clientY - rect.top;

    /*
     * Chaque ligne fait 56 px.
     * On arrondit au créneau de 30 minutes
     * le plus proche.
     */
    const slotIndex =
      Math.floor(y / 56);

    const gridStart =
      timeToMinutes("05:30");

    const dropMinutes =
      gridStart +
      slotIndex * 30;

    return minutesToTime(
      dropMinutes
    );
  }

  function handleDragOverCell(
    event,
    zone
  ) {
    event.preventDefault();

    if (!draggedGroup) return;

    const dropTime =
      getDropTimeFromMouse(event);

    setDragPreview({
      time: dropTime,
      zone,
    });
  }

  async function handleDrop(
    event,
    newTime,
    newZone
  ) {
    event.preventDefault();

    if (!draggedGroup) return;

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
      timeToMinutes(newTime);

    const newEnd =
      newStart + duration;

    const newStartTime =
      minutesToTime(newStart);

    const newEndTime =
      minutesToTime(newEnd);

    const draggedIds =
      draggedGroup.activities.map(
        (activity) => activity.id
      );

    /*
     * Mise à jour immédiate de l'affichage.
     */
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
      /*
       * Toutes les activités du groupe
       * sont sauvegardées simultanément.
       */
      const saveRequests =
        draggedGroup.activities.map(
          async (activity) => {
            const response =
              await fetch("/api/monday", {
                method: "PUT",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  itemId: activity.id,

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
              });

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

      try {
        const response =
          await fetch("/api/monday");

        const data =
          await response.json();

        if (
          response.ok &&
          !data.error
        ) {
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

                affichage:
                  getColumn(
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
        }
      } catch (reloadError) {
        console.error(
          reloadError
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#151619] text-[#ebebed]">

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
                    Glissez-déposez un
                    groupe pour déplacer
                    toutes ses activités
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

                {times.map((time) => (

                  <React.Fragment
                    key={time}
                  >

                    <div className="flex h-14 items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#a1a1a8]">
                      {time}
                    </div>

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
                            onDragOver={(
                              event
                            ) =>
                              handleDragOverCell(
                                event,
                                zone
                              )
                            }
                            onDrop={(
                              event
                            ) => {

                              const dropTime =
                                getDropTimeFromMouse(
                                  event
                                );

                              handleDrop(
                                event,
                                dropTime,
                                zone
                              );
                            }}
                            className="relative h-14 border-b border-r border-[#303137] bg-[#151619]"
                          >

                            {isPreview && (
                              <div
                                className="pointer-events-none absolute left-1 right-1 top-1 z-10 rounded-md border-2 border-dashed border-white/70 bg-white/10"
                                style={{
                                  height:
                                    draggedGroup
                                      ? getGroupHeight(
                                          draggedGroup
                                        )
                                      : 52,
                                }}
                              >
                                <div className="px-2 py-1 text-[10px] font-semibold text-white/80">
                                  {dragPreview.time}
                                </div>
                              </div>
                            )}

                            {groupsHere.map(
                              (group) => {

                                const groupColor =
                                  getActivityColor(
                                    group
                                      .activities[0]
                                  );

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
                                      group.activities
                                        .map(
                                          (
                                            activity
                                          ) =>
                                            activity.activite
                                        )
                                        .join(
                                          "\n"
                                        )
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

    </div>
  );
}

export default App;
