export default function ClaimVsEvidence({ order }) {
  const isMismatch = order.diagnosis_verdict === "false_claim";
  const accent = isMismatch ? "#d9534f" : "#5cb85c";

  return (
    <div style={{ margin: "1.25rem 0" }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: "0" }}>
        <div style={{
          flex: 1, padding: "1rem", borderRadius: "10px 0 0 10px",
          background: "#fafafa", border: "1px solid #eee", borderRight: "none",
        }}>
          <div style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Courier Claims
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 600, marginTop: "6px" }}>
            {(order.courier_reported_reason || "no reason given").replace(/_/g, " ")}
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "56px", background: accent, color: "#fff", fontSize: "1.4rem", fontWeight: 700,
        }}>
          {isMismatch ? "✕" : "✓"}
        </div>

        <div style={{
          flex: 1, padding: "1rem", borderRadius: "0 10px 10px 0",
          background: "#fafafa", border: "1px solid #eee", borderLeft: "none",
        }}>
          <div style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Call Log Shows
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 600, marginTop: "6px" }}>
            {order.call_log_made === null || order.call_log_made === undefined
              ? "no data"
              : order.call_log_made ? "call was made" : "no call logged"}
          </div>
        </div>
      </div>

      {isMismatch && (
        <p style={{ color: accent, fontSize: "0.85rem", marginTop: "8px", fontWeight: 600 }}>
          Mismatch detected — courier's claim isn't backed by evidence.
        </p>
      )}
    </div>
  );
}