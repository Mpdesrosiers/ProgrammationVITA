```jsx
import React, { useState } from "react";

function App() {
  const [selectedDay, setSelectedDay] = useState("Jeudi");

  const days = ["Jeudi", "Vendredi", "Samedi", "Dimanche"];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#151619",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "30px 40px",
          borderBottom: "1px solid #303137",
          backgroundColor: "#1b1c20",
        }}
      >
        {/* TITRE */}
        <div>
          <div
            style={{
              color: "#8580d9",
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            FESTIVAL VITA 2026
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            Programmation
          </h1>
        </div>

        {/* JOURNÉES */}
        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                border: "none",
                borderRadius: "6px",
                padding: "11px 18px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                backgroundColor:
                  selectedDay === day ? "#8580d9" : "#303137",
                color:
                  selectedDay === day ? "#151619" : "white",
              }}
            >
              {day}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENU */}
      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "50px 40px",
        }}
      >
        {/* JOUR */}
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              color: "#8580d9",
              fontSize: "13px",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            JOUR SÉLECTIONNÉ
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            {selectedDay}
          </h2>
        </div>

        {/* VOLETS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "20px",
          }}
        >
          {/* BOUGER */}
          <div
            style={{
              backgroundColor: "#1b1c20",
              border: "1px solid #303137",
              borderRadius: "12px",
              padding: "30px",
            }}
          >
            <div
              style={{
                width: "45px",
                height: "5px",
                borderRadius: "5px",
                backgroundColor: "#00c875",
                marginBottom: "20px",
              }}
            />

            <h3 style={{ margin: 0, fontSize: "21px" }}>
              BOUGER
            </h3>

            <p
              style={{
                color: "#a1a1a8",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              Activités sportives et expériences pour bouger.
            </p>
          </div>

          {/* FÊTER */}
          <div
            style={{
              backgroundColor: "#1b1c20",
              border: "1px solid #303137",
              borderRadius: "12px",
              padding: "30px",
            }}
          >
            <div
              style={{
                width: "45px",
                height: "5px",
                borderRadius: "5px",
                backgroundColor: "#df2f4a",
                marginBottom: "20px",
              }}
            />

            <h3 style={{ margin: 0, fontSize: "21px" }}>
              FÊTER
            </h3>

            <p
              style={{
                color: "#a1a1a8",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              Animations, musique et moments festifs.
            </p>
          </div>

          {/* S'INSPIRER */}
          <div
            style={{
              backgroundColor: "#1b1c20",
              border: "1px solid #303137",
              borderRadius: "12px",
              padding: "30px",
            }}
          >
            <div
              style={{
                width: "45px",
                height: "5px",
                borderRadius: "5px",
                backgroundColor: "#8580d9",
                marginBottom: "20px",
              }}
            />

            <h3 style={{ margin: 0, fontSize: "21px" }}>
              S'INSPIRER
            </h3>

            <p
              style={{
                color: "#a1a1a8",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
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
