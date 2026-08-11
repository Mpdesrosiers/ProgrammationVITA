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

function getColumn(item, index) {
  return item.column_values?.[index]?.text || "";
}

function getDateFromMonday(item) {
  const value = item.column_values?.[1]?.value;

  try {
    return JSON.parse(value || "{}").date || "";
  } catch {
    return "";
  }
}

function getTimeFromText(text) {
  if (!text) return "";

  const match = text.match(/(\d{2}:\d{2})$/);
  return match ? match[1] : "";
}

function timeToMinutes(time) {
  if (!time) return 0;

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function App() {
  const [selectedDay, setSelectedDay] = useState("2026-09-18");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMonday() {
      try {
        setLoading(true);

        const response = await fetch("/api/monday");
        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(
            data.details?.[0]?.message ||
              data.error ||
              "Impossible de charger Monday"
          );
        }

        const items =
          data.data?.boards?.[0]?.items_page?.items || [];

        const formatted = items
          .map((item) => {
            const date = getDateFromMonday(item);

            const startText = getColumn(item, 2);
            const endText = getColumn(item, 3);

            return {
              id: item.id,
              activite: item.name,
              date,
              debut: getTimeFromText(startText),
              fin: getTimeFromText(endText),
              volet: getColumn(item, 4),
              zone: getColumn(item, 5),
              mode: getColumn(item, 6),
              status: getColumn(item, 7),
              affichage: getColumn(item, 8),
              categorieCouleur: getColumn(item, 9),
              notes: getColumn(item, 10),
            };
          })
          .filter((activity) => activity.date);

        setActivities(formatted);
        setError("");
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadMonday();
  }, []);

  const selectedActivities = useMemo(() => {
    return activities.filter(
      (activity) => activity.date === selectedDay
    );
  }, [activities, selectedDay]);

  function getActivityStyle(activity) {
    const start = timeToMinutes(activity.debut);
    const end = timeToMinutes(activity.fin);

    const calendarStart = 5 * 60 + 30;
    const pixelsPer30Minutes = 56;

    const top =
      ((start - calendarStart) / 30) * pixelsPer30Minutes;

    const height =
      Math.max(
        ((end - start) / 30) * pixelsPer30Minutes,
        40
      );

    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor:
        zoneColors[activity.zone] || "#8580d9",
    };
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

            {/* DAYS */}
            <div className="flex gap-2">
              {days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDay(day.date)}
                  className={
                    "rounded-md px-5 py-2 text-sm font-semibold transition " +
                    (selectedDay === day.date
                      ? "bg-[#8580d9] text-[#151619]"
                      : "bg-[#303137] text-white hover:bg-[#404148]")
                  }
                >
                  {day.label}
                </button>
              ))}
            </div>

          </div>

        </div>
      </header>

      {/* CONTENT */}
      <main className="overflow-x-auto p-6">

        {loading && (
          <div className="mx-auto max-w-[1800px] py-10 text-center text-[#a1a1a8]">
            Chargement de la programmation…
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-[1800px] rounded-lg border border-[#df2f4a] bg-[#24171a] p-5 text-[#ff8b9a]">
            Erreur : {error}
          </div>
        )}

        {!loading && !error && (
          <div
            className="mx-auto grid min-w-[1400px] max-w-[1800px]"
            style={{
              gridTemplateColumns:
                "80px repeat(7, minmax(180px, 1fr))",
            }}
          >

            {/* EMPTY TOP LEFT */}
            <div className="border-b border-r border-[#303137] bg-[#151619]" />

            {/* ZONE HEADERS */}
            {zones.map((zone) => (
              <div
                key={zone}
                className="border-b border-r border-[#303137] bg-[#1b1c20] px-3 py-4 text-center"
              >
                <div
                  className="mx-auto mb-2 h-1 w-10 rounded-full"
                  style={{
                    backgroundColor: zoneColors[zone],
                  }}
                />

                <div className="text-sm font-semibold">
                  {zone}
                </div>
              </div>
            ))}

            {/* CALENDAR */}
            {times.map((time) => (
              <React.Fragment key={time}>

                {/* TIME */}
                <div className="flex h-14 items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#a1a1a8]">
                  {time}
                </div>

                {/* ZONES */}
                {zones.map((zone) => {

                  const activitiesHere =
                    selectedActivities.filter(
                      (activity) =>
                        activity.zone === zone &&
                        timeToMinutes(activity.debut) ===
                          timeToMinutes(time)
                    );

                  return (
                    <div
                      key={`${time}-${zone}`}
                      className="relative h-14 border-b border-r border-[#303137] bg-[#151619]"
                    >

                      {activitiesHere.map((activity) => (
                        <div
                          key={activity.id}
                          className="absolute left-1 right-1 z-10 overflow-hidden rounded-md p-2 text-xs font-semibold text-white shadow-lg"
                          style={getActivityStyle(activity)}
                        >
                          <div>
                            {activity.activite}
                          </div>

                          <div className="mt-1 text-[10px] font-normal opacity-80">
                            {activity.debut} – {activity.fin}
                          </div>
                        </div>
                      ))}

                    </div>
                  );
                })}

              </React.Fragment>
            ))}

          </div>
        )}

      </main>

    </div>
  );
}

export default App;
