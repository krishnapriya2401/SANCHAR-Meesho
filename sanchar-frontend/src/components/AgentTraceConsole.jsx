import { useEffect, useState } from "react";
import styles from "../styles/AgentTraceConsole.module.css";

const AGENT_META = {
  monitor: { icon: "🔍", label: "Monitor Agent", color: "#5bc0de" },
  diagnosis: { icon: "🧠", label: "Diagnosis Agent", color: "#f0ad4e" },
  action: { icon: "⚡", label: "Action Agent", color: "#5cb85c" },
};

export default function AgentTraceConsole({ traces, autoPlay = true, stepDelayMs = 800 }) {
  const [visibleCount, setVisibleCount] = useState(autoPlay ? 0 : traces.length);

  useEffect(() => {
    if (!autoPlay) {
      setVisibleCount(traces.length);
      return;
    }
    setVisibleCount(0);
    const timers = traces.map((_, i) =>
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * stepDelayMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [traces, autoPlay, stepDelayMs]);

  return (
    <div className={styles.container}>
      {traces.slice(0, visibleCount).map((t, i) => {
        const meta = AGENT_META[t.agent] || { icon: "🤖", label: t.agent, color: "#999" };
        return (
          <div key={i} className={styles.trace} style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
            <div className={styles.header}>
              <span className={styles.icon}>{meta.icon}</span>
              <span className={styles.agentName} style={{ color: meta.color }}>{meta.label}</span>
              {i < visibleCount - 1 && <span className={styles.doneTag}> — done</span>}
            </div>
            <div className={styles.output}>{t.output}</div>
            {i < traces.length - 1 && i === visibleCount - 1 && (
              <div className={styles.passing}>↓ passing to next agent...</div>
            )}
          </div>
        );
      })}
      {visibleCount < traces.length && <div className={styles.ellipsis}>...</div>}
    </div>
  );
}
