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
  "Terrain synthétique": "#00c875",
  Asphalte: "#df2f4a",
  "Zone démo": "#007eb5",
  "Zone Famille": "#9d50dd",
  Kiosques: "#fdab3d",
  Scène: "#8580d9",
  "Tente VIP": "#7f7f86",
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

function App() {
  const [selectedDay, setSelectedDay] =
    useState("2026-09-18");

  const [activities, setActivities] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [draggedActivity, setDraggedActivity] =
    useState(null);

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

  function getActivityHeight(
    activity
  ) {
    const start =
      timeToMinutes(activity.debut);

    const end =
      timeToMinutes(activity.fin);

    const duration =
      end - start;

    return Math.max(
      (duration / 30) * 56,
      42
    );
  }

  function handleDragStart(
    activity
  ) {
    setDraggedActivity(activity);
  }

  function handleDrop(
    event,
    newTime,
    newZone
  ) {
    event.preventDefault();

    if (!draggedActivity) return;

    const oldStart =
      timeToMinutes(
        draggedActivity.debut
      );

    const oldEnd =
      timeToMinutes(
        draggedActivity.fin
      );

    const duration =
      oldEnd - oldStart;

    const newStart =
      timeToMinutes(newTime);

    const newEnd =
      newStart + duration;

    setActivities((current) =>
      current.map((activity) =>
        activity.id ===
        draggedActivity.id
          ? {
              ...activity,
              zone: newZone,
              debut:
                minutesToTime(
                  newStart
                ),
              fin:
                minutesToTime(
                  newEnd
                ),
            }
          : activity
      )
    );

    setDraggedActivity(null);
  }

  return (
    <div className="min-h-screen bg-[#151619] text-[#ebebed]">

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

            {/* JOURNÉES */}

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

                <div className="text-[#777980]">
                  Glissez-déposez une
                  activité pour la
                  déplacer
                </div>

              </div>

              <div
                className="mx-auto grid min-w-[1400px] max-w-[1800px]"
                style={{
                  gridTemplateColumns:
                    "80px repeat(7, minmax(180px, 1fr))",
                }}
              >

                {/* COIN */}

                <div className="border-b border-r border-[#303137] bg-[#151619]" />

                {/* ZONES */}

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
                          ],
                      }}
                    />

                    <div className="text-sm font-semibold">
                      {zone}
                    </div>

                  </div>

                ))}

                {/* LIGNES HORAIRES */}

                {times.map((time) => (

                  <React.Fragment
                    key={time}
                  >

                    {/* HEURE */}

                    <div className="flex h-14 items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#a1a1a8]">
                      {time}
                    </div>

                    {/* ZONES */}

                    {zones.map(
                      (zone) => {

                        const activitiesHere =
                          selectedActivities.filter(
                            (
                              activity
                            ) =>
                              activity.zone ===
                                zone &&
                              activity.debut ===
                                time
                          );

                        return (

                          <div
                            key={`${time}-${zone}`}
                            onDragOver={(
                              event
                            ) =>
                              event.preventDefault()
                            }
                            onDrop={(
                              event
                            ) =>
                              handleDrop(
                                event,
                                time,
                                zone
                              )
                            }
                            className="relative h-14 border-b border-r border-[#303137] bg-[#151619]"
                          >

                            {activitiesHere.map(
                              (
                                activity
                              ) => (

                                <div
                                  key={
                                    activity.id
                                  }
                                  draggable
                                  onDragStart={() =>
                                    handleDragStart(
                                      activity
                                    )
                                  }
                                  className="absolute left-1 right-1 top-1 z-20 cursor-grab overflow-hidden rounded-md border-2 border-[#151619] p-2 text-xs font-semibold text-white shadow-lg active:cursor-grabbing"
                                  style={{
                                    height:
                                      getActivityHeight(
                                        activity
                                      ) - 4,
                                    backgroundColor:
                                      zoneColors[
                                        activity
                                          .zone
                                      ] ||
                                      "#8580d9",
                                  }}
                                  title={
                                    `${activity.activite}\n` +
                                    `${activity.debut} – ${activity.fin}`
                                  }
                                >

                                  <div>
                                    {
                                      activity.activite
                                    }
                                  </div>

                                  <div className="mt-1 text-[10px] font-normal opacity-80">
                                    {
                                      activity.debut
                                    }{" "}
                                    –{" "}
                                    {
                                      activity.fin
                                    }
                                  </div>

                                </div>

                              )
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
