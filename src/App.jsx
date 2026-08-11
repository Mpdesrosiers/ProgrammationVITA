```jsx
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

function App() {
  const [day, setDay] = useState("Vendredi");

  return (
    <div className="min-h-screen bg-[#151619] text-[#ebebed]">

      {/* HEADER */}
      <header className="border-b border-[#303137] bg-[#1b1c20] px-6 py-5">
        <div className="mx-auto max-w-[1800px]">

          <div className="flex items-center justify-between gap-4">

            <div>
              <div className="text-sm font-semibold text-[#8580d9]">
                FESTIVAL VITA 2026
              </div>

              <h1 className="mt-1 text-2xl font-semibold">
                Programmation
              </h1>
            </div>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() => setDay("Vendredi")}
                className={
                  "rounded-md px-5 py-2 text-sm font-semibold " +
                  (day === "Vendredi"
                    ? "bg-[#8580d9] text-[#151619]"
                    : "bg-[#303137] text-white")
                }
              >
                Vendredi
              </button>

              <button
                type="button"
                onClick={() => setDay("Samedi")}
                className={
                  "rounded-md px-5 py-2 text-sm font-semibold " +
                  (day === "Samedi"
                    ? "bg-[#8580d9] text-[#151619]"
                    : "bg-[#303137] text-white")
                }
              >
                Samedi
              </button>

            </div>

          </div>

        </div>
      </header>

      {/* CALENDAR */}
      <main className="overflow-x-auto p-6">

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

          {/* TIME ROWS */}
          {times.map((time) => (
            <React.Fragment key={time}>

              {/* TIME */}
              <div className="flex h-14 items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#a1a1a8]">
                {time}
              </div>

              {/* ZONES */}
              {zones.map((zone) => (
                <div
                  key={time + zone}
                  className="h-14 border-b border-r border-[#303137] bg-[#151619]"
                />
              ))}

            </React.Fragment>
          ))}

        </div>

      </main>

    </div>
  );
}

export default App;
```
