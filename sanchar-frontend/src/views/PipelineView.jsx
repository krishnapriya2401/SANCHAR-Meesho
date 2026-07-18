import { useEffect, useState, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { fetchOrderDetail, rerunLive } from "../api";
import PipelineInvestigation from "../components/PipelineInvestigation";
import AgentTraceConsole from "../components/AgentTraceConsole";
import { useToast } from "../components/Toast";
import styles from "../styles/PipelineView.module.css";

export default function PipelineView() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const [order, setOrder] = useState(null);
  const ran = useRef(false);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    fetchOrderDetail(orderId).then(setOrder);
  }, [orderId]);

  useEffect(() => {
    if (!order || ran.current) return;
    ran.current = true;
    rerunLive(order.order_id, email)
      .then((result) => {
        if (result.monitor || result.diagnosis || result.action) {
          setPipelineResult({
            monitor: result.monitor,
            diagnosis: result.diagnosis,
            action: result.action,
          });
        }
        setLoading(false);
        const parts = [`Pipeline complete for ${order.order_id}`];
        if (result.email_status === "sent") {
          parts.push("Email sent");
        } else if (result.email_status && result.email_status.startsWith("failed")) {
          parts.push(`Email: ${result.email_status}`);
        }
        showToast(parts.join(" — "));
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [order]);

  if (!order) return null;

  const statusColor = order.status === "in_transit" ? "#1f6feb"
    : order.status === "delivered" ? "#238636" : "#da3633";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to={`/orders/${orderId}`} className={styles.backLink}>&larr; Back to order</Link>
        <span className={styles.separator}>/</span>
        <h2 className={styles.orderTitle}>{orderId}</h2>
        <span className={styles.statusBadge} style={{ background: statusColor }}>
          {order.status}
        </span>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} style={{ animation: "spin 0.8s linear infinite" }} />
          <div>Running AI pipeline agents...</div>
        </div>
      )}

      {error && <div className={styles.error}>Pipeline failed: {error}</div>}

      {pipelineResult && (
        <>
          <PipelineInvestigation pipelineResult={pipelineResult} autoPlay={true} />
          {order?.traces?.length > 0 && (
            <div className={styles.traceSection}>
              <div className={styles.traceLabel}>Pipeline Trace</div>
              <AgentTraceConsole
                traces={order.traces.map((t) => ({ agent: t.agent, output: t.output }))}
                autoPlay={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
