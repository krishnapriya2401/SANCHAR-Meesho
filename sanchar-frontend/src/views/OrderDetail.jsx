import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchOrderDetail, rerunLive } from "../api";
import AgentTraceConsole from "../components/AgentTraceConsole";
import ClaimVsEvidence from "../components/ClaimVsEvidence";
import { useToast } from "../components/Toast";

export default function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [liveTraces, setLiveTraces] = useState(null);
  const [running, setRunning] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    fetchOrderDetail(orderId).then(setOrder);
  }, [orderId]);

  if (!order) return <p style={{ padding: "1.5rem" }}>Loading...</p>;

  const isFalseClaim = order.diagnosis_verdict === "false_claim";

  
  const handleRunLive = async () => {
  setRunning(true);
  setLiveTraces(null);
  const result = await rerunLive(order.order_id);
  const fresh = [];
  if (result.monitor_reason !== undefined) fresh.push({ agent: "monitor", output: result.monitor_reason || "On track, nothing flagged." });
  if (result.diagnosis_explanation) fresh.push({ agent: "diagnosis", output: result.diagnosis_explanation });
  if (result.action_detail) fresh.push({ agent: "action", output: result.action_detail });
  setLiveTraces(fresh);
  setRunning(false);
  showToast(`Pipeline re-run complete for ${order.order_id}`);
};

  return (
    <div style={{ padding: "2rem", maxWidth: "750px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{order.order_id} — {order.courier}</h2>
      <p style={{ color: "#666", marginTop: 0 }}>
        Mode: <strong>{order.mode}</strong> · Status: <strong>{order.status}</strong>
      </p>

     {order.mode === "resolve" && <ClaimVsEvidence order={order} />}

      <h3>Agent Trace (last pipeline run)</h3>
      <AgentTraceConsole
        traces={order.traces.map((t) => ({ agent: t.agent, output: t.output }))}
        autoPlay={true}
      />

      <div style={{ marginTop: "1.5rem" }}>
        <button
          onClick={handleRunLive}
          disabled={running}
          style={{
            padding: "10px 20px", borderRadius: "6px", border: "none",
            background: running ? "#999" : "#333", color: "#fff", cursor: "pointer", fontSize: "0.95rem",
          }}
        >
          {running ? "Running agents..." : "▶ Run Pipeline Live"}
        </button>
        <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "6px" }}>
          Re-invokes the real pipeline right now — a fresh Groq call happens live, watch it below.
        </p>
      </div>

      {liveTraces && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Live Run Output</h3>
          <AgentTraceConsole traces={liveTraces} autoPlay={true} />
        </div>
      )}
    </div>
  );
}