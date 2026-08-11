import React, { useState } from "react";

function App() {
  const [day, setDay] = useState("Jeudi");

  function chooseDay(newDay) {
    setDay(newDay);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#151619",
        color: "#ffffff",
        fontFamily: "Arial",
        padding: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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

          <h1>Programmation</h1>
        </div>

        <div>
          <button onClick={() => chooseDay("Jeudi")}>
            Jeudi
          </button>

          <button onClick={() => chooseDay("Vendredi")}>
            Vendredi
          </button>

          <button onClick={() => chooseDay("Samedi")}>
            Samedi
          </button>

          <button onClick={() => chooseDay("Dimanche")}>
            Dimanche
          </button>
        </div>
      </div>

      <div style={{ marginTop: "80px" }}>
        <h2>{day}</h2>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "30px",
          }}
        >
          <div
            style={{
              background: "#1b1c20",
              padding: "40px",
              borderRadius: "10px",
              flex: 1,
            }}
          >
            <h2>BOUGER</h2>
            <p>Activités sportives</p>
          </div>

          <div
            style={{
              background: "#1b1c20",
              padding: "40px",
              borderRadius: "10px",
              flex: 1,
            }}
          >
            <h2>FÊTER</h2>
            <p>Animations et musique</p>
          </div>

          <div
            style={{
              background: "#1b1c20",
              padding: "40px",
              borderRadius: "10px",
              flex: 1,
            }}
          >
            <h2>S'INSPIRER</h2>
            <p>Découvertes et rencontres</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
