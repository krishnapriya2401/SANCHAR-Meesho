import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrders } from "../api";
import StatsBar from "../components/StatsBar";

const COLUMNS = [
  { key: "in_transit", title: "In Transit", accent: "#f0ad4e" },
  { key: "genuine", title: "Genuine Issues", accent: "#5cb85c" },
  { key: "false_claim", title: "Flagged / False Claims", accent: "#d9534f" },
];

function classifyOrder(o) {
  if (o.status === "in_transit") return "in_transit";
  if (o.diagnosis_summary === "false_claim") return "false_claim";
  return "genuine";
}

function OrderCard({ order }) {
  const bucket = classifyOrder(order);
  const accent = COLUMNS.find((c) => c.key === bucket)?.accent || "#999";

  return (
    <Link
      to={`/orders/${order.order_id}`}
      style={{
        display: "block", padding: "12px 14px", marginBottom: "10px",
        borderRadius: "8px", borderLeft: `4px solid ${accent}`,
        background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        textDecoration: "none", color: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "0.95rem" }}>{order.order_id}</strong>
        <span style={{ fontSize: "0.8rem", color: "#888" }}>{order.courier}</span>
      </div>
      {order.monitor_reason && (
        <div style={{ fontSize: "0.82rem", color: "#666", marginTop: "4px" }}>
          {order.monitor_reason}
        </div>
      )}
      {order.diagnosis_summary && (
        <div style={{
          display: "inline-block", marginTop: "6px", fontSize: "0.75rem",
          padding: "2px 8px", borderRadius: "10px", background: `${accent}20`, color: accent,
        }}>
          {order.diagnosis_summary.replace(/_/g, " ")}
        </div>
      )}
      {order.action_taken && (
        <div style={{ fontSize: "0.78rem", color: "#999", marginTop: "4px" }}>
          → {order.action_taken.replace(/_/g, " ")}
        </div>
      )}
    </Link>
  );
}

export default function Dashboard() {
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
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>Order Board</h2>
      {!loading && <StatsBar orders={orders} />}
      <p style={{ color: "#666", marginTop: 0 }}>{filtered.length} of {orders.length} orders</p>

      <input
        type="text"
        placeholder="Search order ID, courier, or verdict..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%", maxWidth: "400px", padding: "8px 12px", marginBottom: "1.5rem",
          borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.9rem",
        }}
      />

      {loading ? <p>Loading...</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
          {COLUMNS.map((col) => {
            const columnOrders = filtered.filter((o) => classifyOrder(o) === col.key);
            return (
              <div key={col.key}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: `2px solid ${col.accent}`,
                }}>
                  <h4 style={{ margin: 0, color: col.accent }}>{col.title}</h4>
                  <span style={{
                    background: col.accent, color: "#fff", borderRadius: "10px",
                    padding: "1px 9px", fontSize: "0.8rem",
                  }}>
                    {columnOrders.length}
                  </span>
                </div>
                <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "4px" }}>
                  {columnOrders.length === 0 && (
                    <p style={{ color: "#bbb", fontSize: "0.85rem" }}>No orders here</p>
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