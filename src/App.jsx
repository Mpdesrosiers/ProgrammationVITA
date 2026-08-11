```jsx
import React, { useMemo, useState } from "react";

const zones = [
  "Terrain synthétique",
  "Asphalte",
  "Zone démo",
  "Zone Famille",
  "Kiosques",
  "Scène",
  "Tente VIP",
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

const activities = [
  {
    id: 1,
    name: "Activité sportive",
    zone: "Terrain synthétique",
    start: "09:00",
    end: "10:00",
    day: "Vendredi",
    volet: "BOUGER",
  },
  {
    id: 2,
    name: "Démonstration",
    zone: "Zone démo",
    start: "10:00",
    end: "11:30",
    day: "Vendredi",
    volet: "BOUGER",
  },
  {
    id: 3,
    name: "Animation famille",
    zone: "Zone Famille",
    start: "11:00",
    end: "12:00",
    day: "Vendredi",
    volet: "BOUGER",
  },
  {
    id: 4,
    name: "Kiosques partenaires",
    zone: "Kiosques",
    start: "09:00",
    end: "17:00",
    day: "Vendredi",
    volet: "S'INSPIRER",
  },
  {
    id: 5,
    name: "Spectacle",
    zone: "Scène",
    start: "18:00",
    end: "19:00",
    day: "Vendredi",
    volet: "FÊTER",
  },
  {
    id: 6,
    name: "Activité sportive",
    zone: "Terrain synthétique",
    start: "10:00",
    end: "11:00",
    day: "Samedi",
    volet: "BOUGER",
  },
  {
    id: 7,
    name: "Animation",
    zone: "Scène",
    start: "12:00",
    end: "13:00",
    day: "Samedi",
    volet: "FÊTER",
  },
];

const timeSlots = [
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

function timeToMinutes(time) {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function App() {
  const [selectedDay, setSelectedDay] = useState("Vendredi");
  const [selectedVolet, setSelectedVolet] = useState("Tous");

  const filteredActivities = useMemo(function () {
    return activities.filter(function (activity) {
      if (activity.day !== selectedDay) {
        return false;
      }

      if (
        selectedVolet !== "Tous" &&
        activity.volet !== selectedVolet
      ) {
        return false;
      }

      return true;
    });
  }, [selectedDay, selectedVolet]);

  return (
    <div className="min-h-screen bg-[#151619] text-[#ebebed]">
      <header className="border-b border-[#303137] bg-[#1b1c20] px-6 py-5">
        <div className="mx-auto max-w-[1800px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#8580d9]">
                FESTIVAL VITA 2026
              </p>

              <h1 className="mt-1 text-2xl font-semibold">
                Programmation
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={function () {
                  setSelectedDay("Vendredi");
                }}
                className={
                  "rounded-md px-4 py-2 text-sm font-medium " +
                  (selectedDay === "Vendredi"
                    ? "bg-[#8580d9] text-[#151619]"
                    : "bg-[#303137] text-[#ebebed]")
                }
              >
                Vendredi
              </button>

              <button
                type="button"
                onClick={function () {
                  setSelectedDay("Samedi");
                }}
                className={
                  "rounded-md px-4 py-2 text-sm font-medium " +
                  (selectedDay === "Samedi"
                    ? "bg-[#8580d9] text-[#151619]"
                    : "bg-[#303137] text-[#ebebed]")
                }
              >
                Samedi
              </button>

              <select
                value={selectedVolet}
                onChange={function (event) {
                  setSelectedVolet(event.target.value);
                }}
                className="rounded-md border border-[#3c3d43] bg-[#1b1c20] px-3 py-2 text-sm text-[#ebebed]"
              >
                <option value="Tous">Tous</option>
                <option value="BOUGER">BOUGER</option>
                <option value="FÊTER">FÊTER</option>
                <option value="S'INSPIRER">S'INSPIRER</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] overflow-x-auto p-6">
        <div
          className="grid min-w-[1350px]"
          style={{
            gridTemplateColumns:
              "90px repeat(7, minmax(180px, 1fr))",
          }}
        >
          <div className="border-b border-r border-[#303137] bg-[#151619]" />

          {zones.map(function (zone) {
            return (
              <div
                key={zone}
                className="border-b border-r border-[#303137] bg-[#1b1c20] px-3 py-4 text-center text-sm font-semibold"
              >
                <div
                  className="mx-auto mb-2 h-1 w-8 rounded-full"
                  style={{
                    backgroundColor: zoneColors[zone],
                  }}
                />

                {zone}
              </div>
            );
          })}

          {timeSlots.map(function (time) {
            const currentMinutes = timeToMinutes(time);

            return (
              <React.Fragment key={time}>
                <div className="flex min-h-[52px] items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-2 text-xs text-[#a1a1a8]">
                  {time}
                </div>

                {zones.map(function (zone) {
                  const matchingActivities =
                    filteredActivities.filter(function (activity) {
                      const start = timeToMinutes(activity.start);
                      const end = timeToMinutes(activity.end);

                      return (
                        activity.zone === zone &&
                        start <= currentMinutes &&
                        end > currentMinutes
                      );
                    });

                  return (
                    <div
                      key={time + "-" + zone}
                      className="relative min-h-[52px] border-b border-r border-[#303137] bg-[#151619]"
                    >
                      {matchingActivities.map(function (activity) {
                        return (
                          <div
                            key={activity.id}
                            className="absolute inset-x-1 top-1 z-10 rounded-md p-2 text-xs shadow-lg"
                            style={{
                              backgroundColor:
                                zoneColors[activity.zone],
                              color: "#151619",
                            }}
                          >
                            <div className="font-semibold">
                              {activity.name}
                            </div>

                            <div className="mt-1 opacity-80">
                              {activity.start} - {activity.end}
                            </div>

                            <div className="mt-1 text-[10px] font-medium uppercase opacity-70">
                              {activity.volet}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </main>

      <section className="mx-auto max-w-[1800px] px-6 pb-6">
        <div className="rounded-lg border border-[#303137] bg-[#1b1c20] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#a1a1a8]">
            Zones
          </p>

          <div className="flex flex-wrap gap-4">
            {zones.map(function (zone) {
              return (
                <div
                  key={zone}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: zoneColors[zone],
                    }}
                  />

                  {zone}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#303137] px-6 py-4 text-center text-xs text-[#a1a1a8]">
        Programmation VITA 2026
      </footer>
    </div>
  );
}

export default App;
```
