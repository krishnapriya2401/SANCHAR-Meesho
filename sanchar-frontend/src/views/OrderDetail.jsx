import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchOrderDetail } from "../api";
import styles from "../styles/OrderDetail.module.css";

function fmtTime(dt) {
  if (!dt) return "\u2014";
  const d = new Date(dt);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function DetailRow({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value || "\u2014"}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchOrderDetail(orderId).then(setOrder);
  }, [orderId]);

  if (!order) return <p style={{ padding: "1.5rem", color: "#8b949e" }}>Loading...</p>;

  const statusColor = order.status === "in_transit" ? "#1f6feb"
    : order.status === "delivered" ? "#238636" : "#da3633";

  const isDelayed = order.monitor_flagged === true || ["rejected", "rto", "failed"].includes(order.status);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h2 className={styles.orderTitle}>{order.order_id}</h2>
          <span className={styles.statusBadge} style={{ background: statusColor }}>
            {order.status}
          </span>
          <span className={styles.courierTag}>{order.courier}</span>
        </div>

        <div className={styles.detailGrid}>
          <SectionCard title="Customer">
            <DetailRow label="Name" value={order.customer_name} />
            <DetailRow label="Phone" value={order.customer_phone} />
            <DetailRow label="Address" value={order.delivery_address} />
          </SectionCard>
          <SectionCard title="Order">
            <DetailRow label="Item" value={order.item_name} />
            <DetailRow label="Quantity" value={order.quantity != null ? String(order.quantity) : "\u2014"} />
            <DetailRow label="Value" value={order.order_value != null ? `\u20b9${order.order_value.toLocaleString()}` : "\u2014"} />
            <DetailRow label="Pincode" value={order.pincode} />
          </SectionCard>
          <SectionCard title="Delivery">
            <DetailRow label="Status" value={order.status?.replace(/_/g, " ")} />
            <DetailRow label="Courier" value={order.courier} />
            <DetailRow label="Deadline" value={fmtTime(order.deadline)} />
            <DetailRow label="Courier Reason" value={order.courier_reported_reason?.replace(/_/g, " ") || "\u2014"} />
          </SectionCard>
          <SectionCard title="Timeline">
            <DetailRow label="Order Placed" value={fmtTime(order.order_placed_time)} />
            <DetailRow label="Dispatched" value={fmtTime(order.dispatch_time)} />
            <DetailRow label="Hub Arrival" value={fmtTime(order.current_hub_arrival_time)} />
            <DetailRow label="Delivery Attempt" value={fmtTime(order.delivery_attempt_time)} />
          </SectionCard>
        </div>
      </div>

      {isDelayed ? (
        <div className={styles.emailSection}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email to receive action result"
            className={styles.emailInput}
          />
          <Link
            to={`/orders/${order.order_id}/pipeline?email=${encodeURIComponent(email)}`}
            className={styles.pipelineLink}
          >
            &#9654; Run Pipeline &amp; Notify
          </Link>
        </div>
      ) : (
        <Link to={`/orders/${order.order_id}/pipeline`} className={styles.pipelineLink}>
          &#9654; Run AI Pipeline
        </Link>
      )}
    </div>
  );
}
