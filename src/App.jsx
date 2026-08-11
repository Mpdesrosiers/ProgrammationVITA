function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#151619",
        color: "#ebebed",
        fontFamily: "Arial, sans-serif",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div>
            <div
              style={{
                color: "#8580d9",
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              FESTIVAL VITA 2026
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "32px",
              }}
            >
              Programmation
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              style={{
                backgroundColor: "#8580d9",
                color: "#151619",
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                fontWeight: "bold",
              }}
            >
              Jeudi
            </button>

            <button
              style={{
                backgroundColor: "#303137",
                color: "#ebebed",
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                fontWeight: "bold",
              }}
            >
              Vendredi
            </button>

            <button
              style={{
                backgroundColor: "#303137",
                color: "#ebebed",
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                fontWeight: "bold",
              }}
            >
              Samedi
            </button>

            <button
              style={{
                backgroundColor: "#303137",
                color: "#ebebed",
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                fontWeight: "bold",
              }}
            >
              Dimanche
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1b1c20",
              border: "1px solid #303137",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                backgroundColor: "#00c875",
                borderRadius: "4px",
                marginBottom: "20px",
              }}
            />

            <h2 style={{ marginTop: 0 }}>BOUGER</h2>

            <p style={{ color: "#a1a1a8" }}>
              Activités sportives et démonstrations.
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#1b1c20",
              border: "1px solid #303137",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                backgroundColor: "#8580d9",
                borderRadius: "4px",
                marginBottom: "20px",
              }}
            />

            <h2 style={{ marginTop: 0 }}>FÊTER</h2>

            <p style={{ color: "#a1a1a8" }}>
              Animations et programmation festive.
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#1b1c20",
              border: "1px solid #303137",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                backgroundColor: "#fdab3d",
                borderRadius: "4px",
                marginBottom: "20px",
              }}
            />

            <h2 style={{ marginTop: 0 }}>S'INSPIRER</h2>

            <p style={{ color: "#a1a1a8" }}>
              Kiosques, partenaires et découvertes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
