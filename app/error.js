"use client";

function wipeScout() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("axiom-scout")) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

export default function Error() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0c0b10", color: "#eeeae3", fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 420 }}>
        <p style={{ letterSpacing: "0.2em", fontSize: 12, opacity: 0.6 }}>AXIOM SCOUT</p>
        <h1 style={{ fontSize: 22, margin: "8px 0 12px" }}>This browser’s saved library broke the page.</h1>
        <p style={{ opacity: 0.75, lineHeight: 1.5 }}>
          The list sitting in this browser is damaged. The JSON file on your computer is fine. Reset this tab, then use Import JSON. Do not sweep again unless you want a new list.
        </p>
        <button
          type="button"
          onClick={() => {
            wipeScout();
            window.location.replace("/");
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
