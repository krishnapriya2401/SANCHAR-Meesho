import styles from "../styles/StatsBar.module.css";

const COLORS = {
  total: "#e6edf3",
  inTransit: "#d29922",
  genuine: "#3fb950",
  flagged: "#f85149",
};

export default function StatsBar({ orders }) {
  const inTransit = orders.filter((o) => o.status === "in_transit").length;
  const flagged = orders.filter((o) => o.diagnosis_summary === "false_claim").length;
  const genuine = orders.filter((o) => o.status !== "in_transit" && o.diagnosis_summary !== "false_claim").length;

  const items = [
    { label: "Total Orders", value: orders.length, colorKey: "total" },
    { label: "In Transit", value: inTransit, colorKey: "inTransit" },
    { label: "Genuine Issues", value: genuine, colorKey: "genuine" },
    { label: "Flagged / False Claims", value: flagged, colorKey: "flagged" },
  ];

  return (
    <div className={styles.grid}>
      {items.map((s) => (
        <div key={s.label} className={styles.card}>
          <div className={styles.label}>{s.label}</div>
          <div className={styles.value} style={{ color: COLORS[s.colorKey] }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
