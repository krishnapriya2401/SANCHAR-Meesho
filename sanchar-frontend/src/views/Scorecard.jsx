import { useEffect, useState } from "react";
import { fetchAggregation, approveCourier } from "../api";
import ApprovalModal from "../components/ApprovalModal";

const REALLOCATION_THRESHOLD = 50;

function calcRecommendation(courierData, allCouriers) {
  const totalVolume = allCouriers.reduce((sum, c) => sum + c.total_orders, 0);
  const currentSharePct = (courierData.total_orders / totalVolume) * 100;
  const excessFault = Math.max(courierData.fault_rate_pct - REALLOCATION_THRESHOLD, 0);
  const reductionPoints = Math.min(excessFault, 30);
  const newSharePct = Math.max(currentSharePct - reductionPoints, currentSharePct * 0.5);
  return { currentSharePct, newSharePct };
}

function CourierCard({ courier, isFlagged, approved, onCardClick, onUndo }) {
  const color = courier.fault_rate_pct > 40 ? "#d9534f" : courier.fault_rate_pct > 20 ? "#f0ad4e" : "#5cb85c";

  return (
    <div
      onClick={() => isFlagged && !approved && onCardClick(courier.courier)}
      style={{
        padding: "1.25rem", borderRadius: "12px", background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: isFlagged ? `2px solid ${color}` : "1px solid #eee",
        cursor: isFlagged && !approved ? "pointer" : "default",
        transition: "transform 0.15s ease",
      }}
      onMouseEnter={(e) => { if (isFlagged && !approved) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h4 style={{ margin: 0 }}>{courier.courier}</h4>
        {isFlagged && (
          <span style={{ fontSize: "0.7rem", background: color, color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>
            FLAGGED
          </span>
        )}
      </div>

      <div style={{ fontSize: "2.2rem", fontWeight: 700, color, marginTop: "0.5rem" }}>
        {courier.fault_rate_pct}%
      </div>
      <div style={{ fontSize: "0.8rem", color: "#888" }}>fault rate</div>

      <div style={{ height: "6px", background: "#eee", borderRadius: "3px", marginTop: "10px", overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(courier.fault_rate_pct, 100)}%`, height: "100%",
          background: color, borderRadius: "3px", transition: "width 0.6s ease-out",
        }} />
      </div>

      <p style={{ fontSize: "0.82rem", color: "#666", marginTop: "10px" }}>
        {courier.total_orders} orders · {courier.false_claims} false claims
      </p>

      {isFlagged && !approved && (
        <p style={{ color: "#333", fontSize: "0.8rem", marginTop: "8px", fontWeight: 500 }}>
          Click card to review recommendation →
        </p>
      )}

      {isFlagged && approved && (
        <div style={{ marginTop: "8px" }}>
          <p style={{ color: "#5cb85c", fontWeight: 600, fontSize: "0.85rem", margin: 0 }}>
            ✓ Approved — volume reduced
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onUndo(courier.courier); }}
            style={{
              marginTop: "6px", padding: "3px 10px", borderRadius: "6px",
              border: "1px solid #d9534f", background: "#fff", color: "#d9534f",
              cursor: "pointer", fontSize: "0.78rem",
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default function Scorecard() {
  const [data, setData] = useState(null);
  const [approved, setApproved] = useState({});
  const [modalCourier, setModalCourier] = useState(null);
  const [modalStage, setModalStage] = useState("recommend");

  useEffect(() => { fetchAggregation().then(setData); }, []);

  if (!data) return <p style={{ padding: "1.5rem" }}>Loading...</p>;

  const sorted = [...data.scorecard].sort((a, b) => b.fault_rate_pct - a.fault_rate_pct);
  const activeCourierData = data.scorecard.find((c) => c.courier === modalCourier);
  const { currentSharePct, newSharePct } = activeCourierData
    ? calcRecommendation(activeCourierData, data.scorecard)
    : { currentSharePct: 0, newSharePct: 0 };

  const openModal = (courier) => {
    setModalCourier(courier);
    setModalStage("recommend");
  };

  const handleConfirm = async () => {
    await approveCourier(modalCourier);
    setApproved((prev) => ({ ...prev, [modalCourier]: true }));
    setModalStage("applied");
  };

  const handleUndoFromModal = async () => {
    await approveCourier(modalCourier, false);
    setApproved((prev) => ({ ...prev, [modalCourier]: false }));
    setModalCourier(null);
  };

  const handleUndoFromCard = async (courier) => {
    await approveCourier(courier, false);
    setApproved((prev) => ({ ...prev, [courier]: false }));
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>Courier Fault-Rate Scorecard</h2>
      <p style={{ color: "#666", marginTop: 0 }}>
        Aggregated across all resolved orders — {data.flagged_couriers.length} courier(s) flagged for review
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
        {sorted.map((c) => (
          <CourierCard
            key={c.courier}
            courier={c}
            isFlagged={data.flagged_couriers.includes(c.courier)}
            approved={!!approved[c.courier]}
            onCardClick={openModal}
            onUndo={handleUndoFromCard}
          />
        ))}
      </div>

      <h3 style={{ marginTop: "2.5rem" }}>Detail by Region</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
        {data.detail_by_region.map((row, i) => (
          <div key={i} style={{
            padding: "0.75rem", borderRadius: "8px", background: "#fafafa",
            border: "1px solid #eee", fontSize: "0.85rem",
          }}>
            <strong>{row.courier}</strong> · {row.region}
            <div style={{ color: "#888", marginTop: "2px" }}>
              {row.total_orders} orders, {row.fault_rate_pct}% fault
            </div>
          </div>
        ))}
      </div>

      <ApprovalModal
        courier={modalCourier}
        currentSharePct={currentSharePct}
        newSharePct={newSharePct}
        stage={modalStage}
        onConfirm={handleConfirm}
        onCancel={() => setModalCourier(null)}
        onClose={() => setModalCourier(null)}
        onUndo={handleUndoFromModal}
      />
    </div>
  );
}