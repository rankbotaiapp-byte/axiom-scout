"use client";

export default function Error({ reset }) {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0c0b10", color: "#eeeae3", fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 420 }}>
        <p style={{ letterSpacing: "0.2em", fontSize: 12, opacity: 0.6 }}>AXIOM SCOUT</p>
        <h1 style={{ fontSize: 22, margin: "8px 0 12px" }}>This browser’s saved library broke the page.</h1>
        <p style={{ opacity: 0.75, lineHeight: 1.5 }}>
          Your HVAC list is still in the JSON you downloaded. Reset this tab, then Import JSON. Do not sweep again unless you want a new list.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem("axiom-scout:v1");
            } catch {
              /* ignore */
            }
            reset();
          }}
          style={{
            marginTop: 18,
            height: 44,
            padding: "0 18px",
            border: 0,
            borderRadius: 999,
            background: "#eeeae3",
            color: "#0c0b10",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reset library and reload
        </button>
      </div>
    </main>
  );
}
