import React, { useState } from "react";

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

const times = [
  "05:30", "06:00", "06:30", "07:00", "07:30", "08:00",
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00",
  "11:30", "12:00", "12:30", "13:00", "13:30", "14:00",
  "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
  "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
  "20:30", "21:00", "21:30", "22:00", "22:30", "23:00",
  "23:30",
];

const activities = [
  {
    id: 1,
    name: "Yoga",
    zone: "Terrain synthétique",
    day: "Jeudi",
    start: "09:00",
    end: "10:00",
  },
  {
    id: 2,
    name: "Basketball",
    zone: "Asphalte",
    day: "Jeudi",
    start: "10:00",
    end: "11:30",
  },
  {
    id: 3,
    name: "Démonstration",
    zone: "Zone démo",
    day: "Vendredi",
    start: "10:00",
    end: "11:30",
  },
  {
    id: 4,
    name: "Animation famille",
    zone: "Zone Famille",
    day: "Vendredi",
    start: "11:00",
    end: "12:00",
  },
  {
    id: 5,
    name: "Kiosques partenaires",
    zone: "Kiosques",
    day: "Samedi",
    start: "09:00",
    end: "17:00",
  },
  {
    id: 6,
    name: "Spectacle",
    zone: "Scène",
    day: "Samedi",
    start: "14:00",
    end: "15:30",
  },
  {
    id: 7,
    name: "Rencontre VIP",
    zone: "Tente VIP",
    day: "Dimanche",
    start: "12:00",
    end: "13:00",
  },
];

function timeToMinutes(time) {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function App() {
  const [day, setDay] = useState("Jeudi");

  const dayActivities = activities.filter(
    (activity) => activity.day === day
  );

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

              {["Jeudi", "Vendredi", "Samedi", "Dimanche"].map(
                (dayName) => (
                  <button
                    key={dayName}
                    type="button"
                    onClick={() => setDay(dayName)}
                    className={
                      "rounded-md px-5 py-2 text-sm font-semibold transition " +
                      (day === dayName
                        ? "bg-[#8580d9] text-[#151619]"
                        : "bg-[#303137] text-white hover:bg-[#3c3d43]")
                    }
                  >
                    {dayName}
                  </button>
                )
              )}

            </div>

          </div>

        </div>
      </header>

      <main className="overflow-x-auto p-6">

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
                  backgroundColor: zoneColors[zone],
                }}
              />

              <div className="text-sm font-semibold">
                {zone}
              </div>
            </div>
          ))}

          {times.map((time) => (
            <React.Fragment key={time}>

              <div className="flex h-14 items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#a1a1a8]">
                {time}
              </div>

              {zones.map((zone) => {

                const activity = dayActivities.find(
                  (item) =>
                    item.zone === zone &&
                    timeToMinutes(time) >=
                      timeToMinutes(item.start) &&
                    timeToMinutes(time) <
                      timeToMinutes(item.end)
                );

                return (
                  <div
                    key={time + zone}
                    className="relative h-14 border-b border-r border-[#303137] bg-[#151619]"
                  >

                    {activity &&
                      time === activity.start && (
                        <div
                          className="absolute left-1 right-1 top-1 z-10 rounded-md p-2 text-xs shadow-lg"
                          style={{
                            backgroundColor:
                              zoneColors[activity.zone],
                            color: "#151619",
                            height:
                              (timeToMinutes(activity.end) -
                                timeToMinutes(activity.start)) /
                                30 *
                                56 -
                              4,
                          }}
                        >
                          <div className="font-semibold">
                            {activity.name}
                          </div>

                          <div className="mt-1 opacity-80">
                            {activity.start} – {activity.end}
                          </div>
                        </div>
                      )}

                  </div>
                );
              })}

            </React.Fragment>
          ))}

        </div>

      </main>

    </div>
  );
}

export default App;
