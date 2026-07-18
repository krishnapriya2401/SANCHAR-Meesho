import { useState, useEffect } from "react";
import styles from "../styles/PipelineInvestigation.module.css";

const AGENT_COLORS = {
  monitor: { primary: "#58a6ff", bg: "#0d2538", border: "#1f6feb", label: "Monitor Agent" },
  diagnosis: { primary: "#d29922", bg: "#2d1f00", border: "#9e6a03", label: "Diagnosis Agent" },
  action: { primary: "#3fb950", bg: "#0d2818", border: "#238636", label: "Action Agent" },
};

const AGENT_ICONS = {
  monitor: "\u{1F50D}",
  diagnosis: "\u{1F9E0}",
  action: "\u{26A1}",
};

function AgentPanel({ agent, output, visible }) {
  const colors = AGENT_COLORS[agent] || AGENT_COLORS.monitor;
  const icon = AGENT_ICONS[agent] || "\u{1F916}";
  const { summary, metrics } = output || {};
  const panelClass = `${styles.agentPanel} ${visible ? styles.agentPanelVisible : styles.agentPanelHidden}`;

  return (
    <div className={panelClass}>
      <div className={styles.agentCard}
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
        <div className={styles.agentHeader} style={{ borderBottom: `1px solid ${colors.border}` }}>
          <span className={styles.agentHeaderIcon}>{icon}</span>
          <span className={styles.agentHeaderLabel} style={{ color: colors.primary }}>{colors.label}</span>
        </div>

        <div className={styles.agentBody}>
          {metrics && metrics.length > 0 && (
            <div className={styles.metrics}>
              {metrics.map((m, i) => (
                <div key={i} className={styles.metricRow}>
                  <span className={styles.metricLabel}>{m.label}</span>
                  <span className={styles.metricValue}>{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {summary && <div className={styles.agentSummary}>{summary}</div>}

          {!summary && !metrics?.length && (
            <div className={styles.noOutput}>No output available</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectorArrow({ payload, visible }) {
  const connClass = `${styles.connector} ${visible ? styles.connectorVisible : styles.connectorHidden}`;

  return (
    <div className={connClass}>
      <div className={styles.connectorLine}>
        <div className={styles.connectorArrow} />
      </div>
      {payload && (
        <div className={styles.connectorPayload}>{payload}</div>
      )}
    </div>
  );
}

export default function PipelineInvestigation({ pipelineResult, autoPlay = true }) {
  const [revealed, setRevealed] = useState({ monitor: false, diagnosis: false, action: false });

  useEffect(() => {
    if (!autoPlay || !pipelineResult) {
      setRevealed({ monitor: true, diagnosis: true, action: true });
      return;
    }
    setRevealed({ monitor: false, diagnosis: false, action: false });

    const t1 = setTimeout(() => setRevealed(r => ({ ...r, monitor: true })), 300);
    const t2 = setTimeout(() => setRevealed(r => ({ ...r, diagnosis: true })), 1100);
    const t3 = setTimeout(() => setRevealed(r => ({ ...r, action: true })), 1900);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pipelineResult, autoPlay]);

  if (!pipelineResult) {
    return <div className={styles.emptyState}>Run the pipeline to see investigation results</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>AI Pipeline Investigation</span>
        <span className={styles.liveBadge}>LIVE</span>
      </div>

      <div className={styles.pipelineRow}>
        <AgentPanel agent="monitor" output={pipelineResult.monitor} visible={revealed.monitor} />
        <ConnectorArrow payload={pipelineResult.monitor?.carries_forward} visible={revealed.monitor} />
        <AgentPanel agent="diagnosis" output={pipelineResult.diagnosis} visible={revealed.diagnosis} />
        <ConnectorArrow payload={pipelineResult.diagnosis?.carries_forward} visible={revealed.diagnosis} />
        <AgentPanel agent="action" output={pipelineResult.action} visible={revealed.action} />
      </div>
    </div>
  );
}
