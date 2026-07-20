import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrders } from "../api";
import StatsBar from "../components/StatsBar";
import styles from "../styles/OrdersBoard.module.css";

const COLUMNS = [
  { key: "in_transit", title: "In Transit", accent: "#d29922" },
  { key: "genuine", title: "Genuine Issues", accent: "#3fb950" },
  { key: "false_claim", title: "Flagged / False Claims", accent: "#f85149" },
];

function classifyOrder(o) {
  if (o.status === "in_transit") return "in_transit";
  if (o.diagnosis_summary === "false_claim") return "false_claim";
  return "genuine";
}

function OrderCard({ order }) {
  const bucket = classifyOrder(order);
  const accent = COLUMNS.find((c) => c.key === bucket)?.accent || "#8b949e";
  return (
    <Link to={`/orders/${order.order_id}`} className={styles.orderCard}
      style={{ borderLeftColor: accent }}>
      <div className={styles.cardRow}>
        <strong className={styles.orderId}>{order.order_id}</strong>
        <span className={styles.cardRight}>
          <span className={styles.courierName}>{order.courier}</span>
          <span className={styles.cardArrow} style={{ "--accent": accent }}>→</span>
        </span>
      </div>
      {order.monitor_reason && (
        <div className={styles.monitorReason}>{order.monitor_reason}</div>
      )}
      {order.diagnosis_summary && (
        <div className={styles.diagnosisBadge}
          style={{ background: `${accent}22`, color: accent }}>
          {order.diagnosis_summary.replace(/_/g, " ")}
        </div>
      )}
      {order.action_taken && order.action_taken !== "none" && (
        <div className={styles.actionLine}>→ {order.action_taken.replace(/_/g, " ")}</div>
      )}
    </Link>
  );
}

export default function OrdersBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_id.toLowerCase().includes(q) ||
      o.courier.toLowerCase().includes(q) ||
      (o.diagnosis_summary || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Order Board</h1>
      <p className={styles.subtitle}>Live pipeline verdicts across every active COD order.</p>
      <p className={styles.hint}>Click any order card to investigate — run the AI pipeline and see agent decisions live.</p>

      {!loading && <StatsBar orders={orders} />}

      <input type="text" placeholder="Search order ID, courier, or verdict…"
        value={search} onChange={(e) => setSearch(e.target.value)}
        className={styles.searchInput} />

      {loading ? (
        <p className={styles.loadingText}>Loading…</p>
      ) : (
        <div className={styles.columnGrid}>
          {COLUMNS.map((col) => {
            const columnOrders = filtered.filter((o) => classifyOrder(o) === col.key);
            return (
              <div key={col.key}>
                <div className={styles.columnHeader} style={{ borderBottom: `1px solid ${col.accent}66` }}>
                  <h4 className={styles.columnTitle} style={{ color: col.accent }}>{col.title}</h4>
                  <span className={styles.columnCount}
                    style={{ background: `${col.accent}22`, color: col.accent }}>
                    {columnOrders.length}
                  </span>
                </div>
                <div className={styles.columnBody}>
                  {columnOrders.length === 0 && (
                    <p className={styles.emptyMessage}>No orders here</p>
                  )}
                  {columnOrders.map((o) => <OrderCard key={o.order_id} order={o} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
