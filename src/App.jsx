```jsx
import React, { useMemo, useState } from "react";

const DAYS = ["Jeudi", "Vendredi", "Samedi", "Dimanche"];

const ZONES = [
  "Terrain synthétique",
  "Asphalte",
  "Zone démo",
  "Zone Famille",
  "Kiosques",
  "Scène",
  "Tente VIP",
];

const ZONE_COLORS = {
  "Terrain synthétique": "#00c875",
  Asphalte: "#df2f4a",
  "Zone démo": "#007eb5",
  "Zone Famille": "#9d50dd",
  Kiosques: "#fdab3d",
  Scène: "#8580d9",
  "Tente VIP": "#7f7f86",
};

const TIMES = [
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

const INITIAL_ACTIVITIES = [
  {
    id: 1,
    name: "Activité sportive",
    zone: "Terrain synthétique",
    start: "09:00",
    end: "10:30",
    day: "Vendredi",
  },
  {
    id: 2,
    name: "Démonstration",
    zone: "Zone démo",
    start: "10:00",
    end: "11:30",
    day: "Vendredi",
  },
  {
    id: 3,
    name: "Animation famille",
    zone: "Zone Famille",
    start: "11:00",
    end: "12:30",
    day: "Samedi",
  },
  {
    id: 4,
    name: "Kiosques partenaires",
    zone: "Kiosques",
    start: "09:00",
    end: "17:00",
    day: "Samedi",
  },
];

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function App() {
  const [selectedDay, setSelectedDay] = useState("Jeudi");
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const visibleActivities = useMemo(() => {
    return activities.filter((activity) => activity.day === selectedDay);
  }, [activities, selectedDay]);

  function getActivityStyle(activity) {
    const start = timeToMinutes(activity.start);
    const end = timeToMinutes(activity.end);

    const firstTime = timeToMinutes(TIMES[0]);
    const rowHeight = 56;

    const top = ((start - firstTime) / 30) * rowHeight;
    const height = ((end - start) / 30) * rowHeight;

    return {
      top: `${top + 4}px`,
      height: `${Math.max(height - 8, 32)}px`,
      backgroundColor: ZONE_COLORS[activity.zone],
    };
  }

  function updateActivity(field, value) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === selectedActivity.id
          ? { ...activity, [field]: value }
          : activity
      )
    );

    setSelectedActivity((current) =>
      current ? { ...current, [field]: value } : current
    );
  }

  function addActivity() {
    const newActivity = {
      id: Date.now(),
      name: "Nouvelle activité",
      zone: "Terrain synthétique",
      start: "09:00",
      end: "10:00",
      day: selectedDay,
    };

    setActivities((current) => [...current, newActivity]);
    setSelectedActivity(newActivity);
  }

  function deleteActivity() {
    if (!selectedActivity) return;

    setActivities((current) =>
      current.filter((activity) => activity.id !== selectedActivity.id)
    );

    setSelectedActivity(null);
  }

  return (
    <div className="min-h-screen bg-[#151619] text-[#ebebed]">
      {/* HEADER */}
      <header className="border-b border-[#303137] bg-[#1b1c20]">
        <div className="mx-auto max-w-[1900px] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold tracking-wide text-[#8580d9]">
                FESTIVAL VITA 2026
              </div>

              <h1 className="mt-1 text-2xl font-semibold">
                Programmation
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    setSelectedActivity(null);
                  }}
                  className={`rounded-md px-5 py-2 text-sm font-semibold transition ${
                    selectedDay === day
                      ? "bg-[#8580d9] text-[#151619]"
                      : "bg-[#303137] text-[#ebebed] hover:bg-[#3c3d43]"
                  }`}
                >
                  {day}
                </button>
              ))}

              <button
                type="button"
                onClick={addActivity}
                className="ml-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#151619] hover:bg-[#e5e5e5]"
              >
                + Ajouter
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CALENDAR */}
      <main className="overflow-x-auto p-6">
        <div
          className="mx-auto grid min-w-[1450px] max-w-[1900px]"
          style={{
            gridTemplateColumns:
              "80px repeat(7, minmax(185px, 1fr))",
          }}
        >
          {/* TOP LEFT */}
          <div className="border-b border-r border-[#303137] bg-[#151619]" />

          {/* ZONE HEADERS */}
          {ZONES.map((zone) => (
            <div
              key={zone}
              className="border-b border-r border-[#303137] bg-[#1b1c20] px-3 py-4 text-center"
            >
              <div
                className="mx-auto mb-2 h-1 w-10 rounded-full"
                style={{
                  backgroundColor: ZONE_COLORS[zone],
                }}
              />

              <div className="text-sm font-semibold">{zone}</div>
            </div>
          ))}

          {/* TIME GRID */}
          {TIMES.map((time) => (
            <React.Fragment key={time}>
              {/* TIME */}
              <div className="flex h-14 items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#8f9098]">
                {time}
              </div>

              {/* ZONES */}
              {ZONES.map((zone) => (
                <div
                  key={`${time}-${zone}`}
                  className="relative h-14 border-b border-r border-[#303137] bg-[#151619]"
                >
                  {time === TIMES[0] &&
                    visibleActivities
                      .filter((activity) => activity.zone === zone)
                      .map((activity) => (
                        <button
                          key={activity.id}
                          type="button"
                          onClick={() => setSelectedActivity(activity)}
                          className="absolute left-1 right-1 z-20 overflow-hidden rounded-md p-2 text-left text-xs shadow-lg transition hover:brightness-110"
                          style={getActivityStyle(activity)}
                        >
                          <div className="font-semibold text-[#151619]">
                            {activity.name}
                          </div>

                          <div className="mt-1 text-[11px] text-[#151619] opacity-80">
                            {activity.start} – {activity.end}
                          </div>
                        </button>
                      ))}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </main>

      {/* EDIT PANEL */}
      {selectedActivity && (
        <div className="fixed inset-y-0 right-0 z-50 w-[380px] border-l border-[#303137] bg-[#1b1c20] p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Modifier l'activité
            </h2>

            <button
              type="button"
              onClick={() => setSelectedActivity(null)}
              className="text-xl text-[#a1a1a8] hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block">
              <div className="mb-2 text-xs font-medium text-[#a1a1a8]">
                Nom
              </div>

              <input
                value={selectedActivity.name}
                onChange={(event) =>
                  updateActivity("name", event.target.value)
                }
                className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm outline-none focus:border-[#8580d9]"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-medium text-[#a1a1a8]">
                Zone
              </div>

              <select
                value={selectedActivity.zone}
                onChange={(event) =>
                  updateActivity("zone", event.target.value)
                }
                className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm outline-none"
              >
                {ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <div className="mb-2 text-xs font-medium text-[#a1a1a8]">
                  Début
                </div>

                <input
                  type="time"
                  value={selectedActivity.start}
                  onChange={(event) =>
                    updateActivity("start", event.target.value)
                  }
                  className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
                />
              </label>

              <label>
                <div className="mb-2 text-xs font-medium text-[#a1a1a8]">
                  Fin
                </div>

                <input
                  type="time"
                  value={selectedActivity.end}
                  onChange={(event) =>
                    updateActivity("end", event.target.value)
                  }
                  className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <div className="mb-2 text-xs font-medium text-[#a1a1a8]">
                Jour
              </div>

              <select
                value={selectedActivity.day}
                onChange={(event) =>
                  updateActivity("day", event.target.value)
                }
                className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={deleteActivity}
              className="w-full rounded-md border border-[#df2f4a] px-4 py-2 text-sm font-semibold text-[#df2f4a] hover:bg-[#df2f4a] hover:text-white"
            >
              Supprimer l'activité
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
```
