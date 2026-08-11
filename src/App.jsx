```jsx
import React, { useState } from "react";

function App() {
  const [selectedDay, setSelectedDay] = useState("Jeudi");

  const days = ["Jeudi", "Vendredi", "Samedi", "Dimanche"];

  return (
    <div className="min-h-screen bg-[#151619] text-white">

      {/* HEADER */}
      <header className="border-b border-[#303137] bg-[#1b1c20] px-8 py-6">
        <div className="flex items-center justify-between">

          {/* TITRE */}
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
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={
                  "rounded-md px-5 py-2 text-sm font-semibold transition " +
                  (selectedDay === day
                    ? "bg-[#8580d9] text-[#151619]"
                    : "bg-[#303137] text-white hover:bg-[#3c3d43]")
                }
              >
                {day}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* CONTENU */}
      <main className="mx-auto max-w-[1400px] px-8 py-12">

        {/* JOUR SÉLECTIONNÉ */}
        <div className="mb-8">
          <div className="text-sm text-[#8580d9]">
            JOUR SÉLECTIONNÉ
          </div>

          <h2 className="mt-1 text-3xl font-semibold">
            {selectedDay}
          </h2>
        </div>

        {/* 3 VOLETS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* BOUGER */}
          <div className="rounded-xl border border-[#303137] bg-[#1b1c20] p-8">
            <div className="mb-4 h-2 w-12 rounded-full bg-[#00c875]" />

            <h3 className="text-xl font-semibold">
              BOUGER
            </h3>

            <p className="mt-3 text-sm text-[#a1a1a8]">
              Activités sportives et expériences pour bouger.
            </p>
          </div>

          {/* FÊTER */}
          <div className="rounded-xl border border-[#303137] bg-[#1b1c20] p-8">
            <div className="mb-4 h-2 w-12 rounded-full bg-[#df2f4a]" />

            <h3 className="text-xl font-semibold">
              FÊTER
            </h3>

            <p className="mt-3 text-sm text-[#a1a1a8]">
              Animations, musique et moments festifs.
            </p>
          </div>

          {/* S'INSPIRER */}
          <div className="rounded-xl border border-[#303137] bg-[#1b1c20] p-8">
            <div className="mb-4 h-2 w-12 rounded-full bg-[#8580d9]" />

            <h3 className="text-xl font-semibold">
              S'INSPIRER
            </h3>

            <p className="mt-3 text-sm text-[#a1a1a8]">
              Rencontres, découvertes et inspiration.
            </p>
          </div>

        </div>

      </main>

    </div>
  );
}

export default App;
```
