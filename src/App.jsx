```jsx
import React, { useState } from "react";

const zones = [
  { name: "Terrain synthétique", color: "#00c875" },
  { name: "Asphalte", color: "#df2f4a" },
  { name: "Zone démo", color: "#007eb5" },
  { name: "Zone Famille", color: "#9d50dd" },
  { name: "Kiosques", color: "#fdab3d" },
  { name: "Scène", color: "#8580d9" },
  { name: "Tente VIP", color: "#7f7f86" },
];

const times = [
  "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00",
  "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00",
  "20:30", "21:00", "21:30", "22:00", "22:30",
  "23:00", "23:30",
];

function App() {
  const [selectedDay, setSelectedDay] = useState("Vendredi");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#151619",
        color: "#ebebed",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#1b1c20",
          borderBottom: "1px solid #303137",
          padding: "20px 24px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: "1800px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div>
            <div
              style={{
                color: "#8580d9",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "0.05em",
              }}
            >
              FESTIVAL VITA 2026
            </div>

            <h1
              style={{
                margin: "5px 0 0",
                fontSize: "26px",
              }}
            >
              Programmation
            </h1>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {["Vendredi", "Samedi"].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                style={{
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 18px",
                  cursor: "pointer",
                  fontWeight: "600",
                  background:
                    selectedDay === day ? "#8580d9" : "#303137",
                  color:
                    selectedDay === day ? "#151619" : "#ebebed",
                }}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main
        style={{
          overflowX: "auto",
          padding: "24px",
        }}
      >
        <div
          style={{
            minWidth: "1400px",
            maxWidth: "1800px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "80px repeat(7, minmax(180px, 1fr))",
            }}
          >
            <div
              style={{
                height: "80px",
                background: "#151619",
                borderBottom: "1px solid #303137",
                borderRight: "1px solid #303137",
              }}
            />

            {zones.map((zone) => (
              <div
                key={zone.name}
                style={{
                  height: "80px",
                  background: "#1b1c20",
                  borderBottom: "1px solid #303137",
                  borderRight: "1px solid #303137",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 10px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "4px",
                    borderRadius: "4px",
                    background: zone.color,
                    marginBottom: "10px",
                  }}
                />

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  {zone.name}
                </div>
              </div>
            ))}

            {times.map((time) => (
              <React.Fragment key={time}>
                <div
                  style={{
                    height: "56px",
                    boxSizing: "border-box",
                    borderBottom: "1px solid #303137",
                    borderRight: "1px solid #303137",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: "12px",
                    color: "#a1a1a8",
                    fontSize: "12px",
                  }}
                >
                  {time}
                </div>

                {zones.map((zone) => (
                  <div
                    key={time + zone.name}
                    style={{
                      height: "56px",
                      boxSizing: "border-box",
                      borderBottom: "1px solid #303137",
                      borderRight: "1px solid #303137",
                      background: "#151619",
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
```
