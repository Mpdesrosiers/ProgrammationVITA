import React from "react";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#151619",
        color: "white",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Festival VITA 2026</h1>

      <p>La nouvelle version fonctionne.</p>

      <button
        onClick={() => alert("Ça fonctionne !")}
        style={{
          marginTop: "20px",
          padding: "12px 20px",
          cursor: "pointer",
        }}
      >
        Tester
      </button>
    </div>
  );
}

export default App;
