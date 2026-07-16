import { useEffect, useState } from "react";

const AGENT_META = {
  monitor: { icon: "🔍", label: "Monitor Agent", color: "#5bc0de" },
  diagnosis: { icon: "🧠", label: "Diagnosis Agent", color: "#f0ad4e" },
  action: { icon: "⚡", label: "Action Agent", color: "#5cb85c" },
};

/**
 * Reveals trace steps one at a time with a short delay, so it reads like a live
 * process happening rather than a static list. Pass `autoPlay={false}` to show
 * everything instantly (e.g. when just re-opening an already-viewed order).
 */
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
    <div style={{
      background: "#1e1e1e", borderRadius: "8px", padding: "1.25rem",
      fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "0.9rem",
      minHeight: "80px",
    }}>
      {traces.slice(0, visibleCount).map((t, i) => {
        const meta = AGENT_META[t.agent] || { icon: "🤖", label: t.agent, color: "#999" };
        return (
          <div
            key={i}
            style={{
              marginBottom: "1rem",
              animation: "fadeSlideIn 0.4s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span>{meta.icon}</span>
              <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
              {i < visibleCount - 1 && <span style={{ color: "#555" }}> — done</span>}
            </div>
            <div style={{ color: "#d4d4d4", paddingLeft: "26px" }}>{t.output}</div>
            {i < traces.length - 1 && i === visibleCount - 1 && (
              <div style={{ paddingLeft: "26px", color: "#666", marginTop: "4px" }}>↓ passing to next agent...</div>
            )}
          </div>
        );
      })}
      {visibleCount < traces.length && (
        <div style={{ color: "#666" }}>...</div>
      )}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}