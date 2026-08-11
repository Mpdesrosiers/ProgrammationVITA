```jsx
import React from "react";

const zones = [
  "Terrain synthétique",
  "Asphalte",
  "Zone démo",
  "Zone Famille",
  "Kiosques",
  "Scène",
  "Tente VIP",
];

const days = ["Jeudi", "Vendredi", "Samedi", "Dimanche"];

function App() {
  return (
    <div className="min-h-screen bg-[#151619] text-[#ebebed]">

      <header className="border-b border-[#303137] bg-[#1b1c20] px-6 py-5">
        <div className="mx-auto max-w-[1800px]">

          <div className="mb-5">
            <div className="text-sm font-semibold text-[#8580d9]">
              FESTIVAL VITA 2026
            </div>

            <h1 className="mt-1 text-2xl font-semibold">
              Programmation
            </h1>
          </div>

          <div className="flex gap-2">
            {days.map(function (day) {
              return (
                <button
                  key={day}
                  type="button"
                  className="rounded-md bg-[#303137] px-5 py-2 text-sm font-semibold text-white"
                >
                  {day}
                </button>
              );
            })}
          </div>

        </div>
      </header>

      <main className="overflow-x-auto p-6">

        <div className="mx-auto min-w-[1400px] max-w-[1800px]">

          <div
            className="grid"
            style={{
              gridTemplateColumns: "100px repeat(7, 1fr)",
            }}
          >

            <div className="border-b border-r border-[#303137] bg-[#151619]" />

            {zones.map(function (zone) {
              return (
                <div
                  key={zone}
                  className="border-b border-r border-[#303137] bg-[#1b1c20] px-3 py-4 text-center text-sm font-semibold"
                >
                  {zone}
                </div>
              );
            })}

            <div className="border-b border-r border-[#303137] bg-[#151619] p-3 text-right text-xs text-[#a1a1a8]">
              09:00
            </div>

            {zones.map(function (zone) {
              return (
                <div
                  key={zone}
                  className="h-20 border-b border-r border-[#303137] bg-[#151619]"
                />
              );
            })}

            <div className="border-b border-r border-[#303137] bg-[#151619] p-3 text-right text-xs text-[#a1a1a8]">
              09:30
            </div>

            {zones.map(function (zone) {
              return (
                <div
                  key={zone}
                  className="h-20 border-b border-r border-[#303137] bg-[#151619]"
                />
              );
            })}

            <div className="border-b border-r border-[#303137] bg-[#151619] p-3 text-right text-xs text-[#a1a1a8]">
              10:00
            </div>

            {zones.map(function (zone) {
              return (
                <div
                  key={zone}
                  className="h-20 border-b border-r border-[#303137] bg-[#151619]"
                />
              );
            })}

          </div>

        </div>

      </main>

    </div>
  );
}

export default App;
```
