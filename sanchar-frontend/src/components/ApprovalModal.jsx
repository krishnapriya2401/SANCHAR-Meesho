export default function ApprovalModal({
  courier, currentSharePct, newSharePct, stage, onConfirm, onCancel, onClose, onUndo,
}) {
  if (!courier) return null;

  return (
    <div
      onClick={onCancel || onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "12px", padding: "1.75rem",
          width: "380px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        {stage === "recommend" && (
          <>
            <h3 style={{ marginTop: 0 }}>Reallocation Recommendation</h3>
            <p style={{ color: "#555", fontSize: "0.9rem" }}>
              <strong>{courier}</strong> is flagged for an above-threshold fraud rate.
              Sanchar recommends reducing their order volume share:
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem",
              margin: "1.25rem 0", fontSize: "1.5rem", fontWeight: 700,
            }}>
              <span style={{ color: "#999" }}>{currentSharePct.toFixed(0)}%</span>
              <span style={{ color: "#ccc" }}>→</span>
              <span style={{ color: "#d9534f" }}>{newSharePct.toFixed(0)}%</span>
            </div>
            <p style={{ color: "#888", fontSize: "0.8rem" }}>
              This is a suggested change only. Nothing is applied until you confirm.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button
                onClick={onCancel}
                style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: "#333", color: "#fff", cursor: "pointer" }}
              >
                Confirm Reduction
              </button>
            </div>
          </>
        )}

        {stage === "applied" && (
          <>
            <div style={{ textAlign: "center", fontSize: "2rem" }}>✓</div>
            <h3 style={{ textAlign: "center", marginTop: "0.5rem" }}>Applied</h3>
            <p style={{ color: "#555", fontSize: "0.9rem", textAlign: "center" }}>
              <strong>{courier}</strong>'s volume share reduced to <strong>{newSharePct.toFixed(0)}%</strong>.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button
                onClick={onUndo}
                style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #d9534f", background: "#fff", color: "#d9534f", cursor: "pointer" }}
              >
                Undo
              </button>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: "#333", color: "#fff", cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}