import { useEffect, useState } from "react";

const SAVINGS_PER_FALSE_CLAIM = 285; // ₹ per your deck's two-way shipping stat

function useCountUp(target, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = null;
    let frame;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3)))); // ease-out cubic
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function StatBlock({ label, value, prefix = "", color = "#333" }) {
  const animated = useCountUp(value);
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: "2rem", fontWeight: 700, color }}>
        {prefix}{animated.toLocaleString("en-IN")}
      </div>
      <div style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

export default function StatsBar({ orders }) {
  const total = orders.length;
  const falseClaims = orders.filter((o) => o.diagnosis_summary === "false_claim").length;
  const flaggedInTransit = orders.filter((o) => o.status === "in_transit" && o.monitor_flagged).length;
  const saved = falseClaims * SAVINGS_PER_FALSE_CLAIM;

  return (
    <div style={{
      display: "flex", background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem",
      marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", gap: "1rem",
    }}>
      <StatBlock label="orders processed" value={total} />
      <StatBlock label="stuck shipments caught" value={flaggedInTransit} color="#f0ad4e" />
      <StatBlock label="fraud cases caught" value={falseClaims} color="#d9534f" />
      <StatBlock label="saved in shipping" value={saved} prefix="₹" color="#5cb85c" />
    </div>
  );
}