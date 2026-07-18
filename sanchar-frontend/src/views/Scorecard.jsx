import { useEffect, useState } from "react";
import { fetchAggregation } from "../api";
import {
  PieChart, Pie, Cell, Tooltip, Legend as PieLegend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip,
  ResponsiveContainer,
} from "recharts";
import styles from "../styles/Scorecard.module.css";

const PIE_COLORS = ["#58a6ff", "#d29922", "#3fb950"];

function darkTheme() {
  return {
    tooltip: { contentStyle: { background: "#161b22", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", fontSize: "0.8rem" } },
    axis: { tick: { fill: "#8b949e", fontSize: 12 }, axisLine: { stroke: "#30363d" }, tickLine: { stroke: "#30363d" } },
    grid: { stroke: "#21262d" },
  };
}

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function StatsRow({ items }) {
  return (
    <div className={styles.statsRow}>
      {items.map((item, i) => (
        <div key={i} className={styles.statCard}>
          <div className={styles.statValue}>{item.value}</div>
          <div className={styles.statLabel}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

const CAUSE_COLORS = { "Hub Congestion": "#d29922", "Weather Or Transit Delay": "#58a6ff", "Address Verification Hold": "#3fb950" };

export default function Scorecard() {
  const [data, setData] = useState(null);
  const th = darkTheme();

  useEffect(() => { fetchAggregation().then(setData); }, []);

  if (!data) return <p style={{ padding: "2rem", color: "#8b949e", background: "#0d1117", minHeight: "100vh" }}>Loading...</p>;

  const rc = data.root_cause || [];
  const rr = data.regional_risk || [];
  const af = data.action_financial || {};
  const fc = data.false_claim_rate || {};
  const so = data.savings_over_time || [];

  const causeKeys = [...new Set(rr.flatMap(r => Object.keys(r).filter(k => k !== "region")))];

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Operations Scorecard</h2>
      <p className={styles.subtitle}>Aggregate insights from AI pipeline across all orders</p>

      {data.executive_summary && (
        <Section title="Executive Summary">
          <div className={styles.summaryText}>{data.executive_summary}</div>
        </Section>
      )}

      <Section title="Overview">
        <StatsRow items={[
          { label: "Total Resolved Disputes", value: fc.total_resolved ?? 0 },
          { label: "False Claim Rate", value: fc.false_claim_pct != null ? `${fc.false_claim_pct}%` : "\u2014" },
          { label: "Avg Delay (flagged)", value: data.delay_distribution?.avg_hours ? `${data.delay_distribution.avg_hours}h` : "\u2014" },
          { label: "Net Financial Impact", value: af.total_cost != null ? `₹${af.total_cost.toLocaleString()}` : "\u2014" },
        ]} />
      </Section>

      {rc.length > 0 && (
        <Section title="Root Cause Breakdown">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={rc} dataKey="count" nameKey="cause" cx="50%" cy="50%" outerRadius={90}
                label={({ cause, pct }) => `${cause} ${pct}%`}
                labelLine={{ stroke: "#484f58", strokeWidth: 1 }}>
                {rc.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#0d1117" strokeWidth={2} />)}
              </Pie>
              <Tooltip {...th.tooltip} />
              <PieLegend wrapperStyle={{ fontSize: "0.8rem", color: "#c9d1d9" }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      )}

      {rr.length > 0 && (
        <Section title="Regional Risk Analysis">
          <div style={{ overflowX: "auto" }}>
            <table className={styles.regionTable}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #30363d", color: "#8b949e" }}>Region</th>
                  {causeKeys.map(k => (
                    <th key={k} className={styles.regionTableTh}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rr.map((row, i) => {
                  const total = causeKeys.reduce((s, k) => s + (row[k] || 0), 0);
                  return (
                    <tr key={i}>
                      <td className={styles.regionCell}>{row.region}</td>
                      {causeKeys.map(k => {
                        const val = row[k] || 0;
                        const pct = total ? val / total : 0;
                        const color = CAUSE_COLORS[k] || "#58a6ff";
                        return (
                          <td key={k} className={styles.regionCellRight}
                            style={{ background: `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, ${pct * 0.3})`, fontWeight: val > 0 ? 600 : 400 }}>
                            {val || "\u2014"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {so.length > 1 && (
        <Section title="Cumulative Savings Over Time">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={so}>
              <CartesianGrid stroke={th.grid.stroke} />
              <XAxis dataKey="date" {...th.axis} />
              <YAxis {...th.axis} tickFormatter={(v) => `₹${v}`} />
              <LineTooltip {...th.tooltip} formatter={(v) => [`₹${v.toLocaleString()}`, "Cumulative Savings"]} />
              <Line type="monotone" dataKey="cumulative" stroke="#3fb950" strokeWidth={2.5} dot={{ fill: "#3fb950", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className={styles.savingsFooter}>
            <span style={{ color: "#8b949e" }}>Total saved: <strong style={{ color: "#3fb950" }}>+₹{(so[so.length-1]?.cumulative || 0).toLocaleString()}</strong></span>
          </div>
        </Section>
      )}

      {af.actions?.length > 0 && (
        <Section title="Action Breakdown">
          <div className={styles.actionGrid}>
            {af.actions.map((a, i) => (
              <div key={i} className={styles.actionCard}>
                <div className={styles.actionCardLabel}>{a.action}</div>
                <div className={styles.actionCardCount}>{a.count}</div>
                <div className={styles.actionCardImpact}
                  style={{ color: a.financial_impact < 0 ? "#d29922" : a.financial_impact > 0 ? "#3fb950" : "#8b949e" }}>
                  {a.financial_impact !== 0 ? `${a.financial_impact > 0 ? " " : " "}₹${a.financial_impact.toLocaleString()}` : "₹0"}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {fc.by_region?.length > 0 && (
        <Section title="False Claim Rate by Region">
          <div className={styles.regionGrid}>
            {fc.by_region.map((r, i) => (
              <div key={i} className={styles.regionCard}>
                <div className={styles.regionName}>{r.region}</div>
                <div className={styles.regionStats}>
                  {r.false_claims}/{r.total} false claims — <span style={{ color: r.pct > 30 ? "#f85149" : "#3fb950", fontWeight: 600 }}>{r.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
