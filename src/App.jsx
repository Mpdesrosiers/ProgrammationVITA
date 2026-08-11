import React, { useState } from "react";

function App() {
  const [day, setDay] = useState("Jeudi");

  const days = ["Jeudi", "Vendredi", "Samedi", "Dimanche"];

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
    "Asphalte": "#df2f4a",
    "Zone démo": "#007eb5",
    "Zone Famille": "#9d50dd",
    "Kiosques": "#fdab3d",
    "Scène": "#8580d9",
    "Tente VIP": "#7f7f86",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#151619",
        color: "#ffffff",
        fontFamily: "Arial",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "30px 40px",
          borderBottom: "1px solid #303137",
          background: "#1b1c20",
        }}
      >
        <div>
          <div
            style={{
              color: "#8580d9",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            FESTIVAL VITA 2026
          </div>

          <h1 style={{ margin: "6px 0 0 0" }}>
            Programmation
          </h1>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {days.map((item) => (
            <button
              key={item}
              onClick={() => setDay(item)}
              style={{
                padding: "11px 18px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                background:
                  day === item ? "#8580d9" : "#303137",
                color:
                  day === item ? "#151619" : "#ffffff",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <main
        style={{
          padding: "40px",
          overflowX: "auto",
        }}
      >
        <h2 style={{ marginBottom: "25px" }}>
          {day}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              background: "#1b1c20",
              borderRadius: "10px",
              padding: "25px",
              border: "1px solid #303137",
            }}
          >
            <h2 style={{ color: "#00c875" }}>
              BOUGER
            </h2>
          </div>

          <div
            style={{
              background: "#1b1c20",
              borderRadius: "10px",
              padding: "25px",
              border: "1px solid #303137",
            }}
          >
            <h2 style={{ color: "#df2f4a" }}>
              FÊTER
            </h2>
          </div>

          <div
            style={{
              background: "#1b1c20",
              borderRadius: "10px",
              padding: "25px",
              border: "1px solid #303137",
            }}
          >
            <h2 style={{ color: "#8580d9" }}>
              S'INSPIRER
            </h2>
          </div>
        </div>

        <div
          style={{
            minWidth: "1200px",
            display: "grid",
            gridTemplateColumns:
              "repeat(7, 1fr)",
            borderTop: "1px solid #303137",
            borderLeft: "1px solid #303137",
          }}
        >
          {zones.map((zone) => (
            <div
              key={zone}
              style={{
                minHeight: "500px",
                background: "#151619",
                borderRight: "1px solid #303137",
                borderBottom: "1px solid #303137",
              }}
            >
              <div
                style={{
                  padding: "18px 10px",
                  textAlign: "center",
                  background: "#1b1c20",
                  borderBottom: "1px solid #303137",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    width: "35px",
                    height: "4px",
                    borderRadius: "4px",
                    background: zoneColors[zone],
                    margin: "0 auto 10px auto",
                  }}
                />

                {zone}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
