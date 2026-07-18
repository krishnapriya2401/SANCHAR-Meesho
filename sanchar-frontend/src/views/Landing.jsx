import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAggregation } from "../api";
import styles from "../styles/Landing.module.css";

function useCountUp(target, durationMs = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return n;
}

const AGENTS = [
  { key: "monitor", icon: "🔍", label: "Monitor", color: "#58a6ff", bg: "#0d2538", border: "#1f6feb",
    blurb: "Detects delivery stalls and failed attempts in real-time across every hub." },
  { key: "diagnosis", icon: "🧠", label: "Diagnosis", color: "#d29922", bg: "#2d1f00", border: "#9e6a03",
    blurb: "Identifies root cause: weather, congestion, address issues — or courier fraud." },
  { key: "action", icon: "⚡", label: "Action", color: "#3fb950", bg: "#0d2818", border: "#238636",
    blurb: "Automatically triggers SMS, wallet credit, courier invoice, or reshipment." },
  { key: "aggregation", icon: "📊", label: "Aggregation", color: "#bc8cff", bg: "#1c1335", border: "#7c3aed",
    blurb: "Cross-order intelligence surfacing root cause trends, regional risk, and financial impact." },
];

const PIPELINE_AGENTS = AGENTS.slice(0, 3);

export default function Landing() {
  const [agg, setAgg] = useState(null);
  useEffect(() => { fetchAggregation().then(setAgg); }, []);

  const orders = useCountUp(1240);
  const recovered = useCountUp(71200);
  const rate = useCountUp(33);
  const falseClaims = useCountUp(agg?.false_claim_rate?.total_resolved ?? 268);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div aria-hidden className={styles.heroGlow} />
        <div aria-hidden className={styles.heroGrid} />

        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Live · 3+1 agent AI pipeline running on 1,240 orders
          </div>

          <h1 className={styles.heroTitle}>Sanchar</h1>

          <p className={styles.heroSubtitle}>AI-Powered Logistics Intelligence for the COD Economy</p>

          <p className={styles.heroDescription}>
            60–70% of India's e-commerce runs on Cash on Delivery — a system quietly bleeding crores
            to courier false claims and silent hub delays. Sanchar runs Monitor → Diagnosis → Action
            on every order, while Aggregation cross-analyses patterns across all orders for ops intelligence.
          </p>

          <div className={styles.pipelineWrapper}>
            <div className={styles.pipelineRow}>
              {PIPELINE_AGENTS.map((a, i) => (
                <div key={a.key} className={styles.agentSlot}>
                  <div className={styles.agentCard}
                    style={{ background: a.bg, border: `1px solid ${a.border}`, boxShadow: `0 0 24px ${a.color}22`, animationDelay: `${i * 0.4}s` }}>
                    <div className={styles.agentIcon}>{a.icon}</div>
                    <div className={styles.agentLabel} style={{ color: a.color }}>{a.label}</div>
                  </div>
                  {i < PIPELINE_AGENTS.length - 1 && <div className={styles.agentDivider} />}
                </div>
              ))}
            </div>
            <div className={styles.verticalConnector} />
            <div className={styles.aggregationCard}
              style={{ background: AGENTS[3].bg, border: `1px solid ${AGENTS[3].border}`, boxShadow: `0 0 24px ${AGENTS[3].color}22` }}>
              <span className={styles.aggregationIcon}>{AGENTS[3].icon}</span>
              <span className={styles.aggregationLabel} style={{ color: AGENTS[3].color }}>{AGENTS[3].label} Agent</span>
              <span className={styles.aggregationHint}>— cross-order intelligence</span>
            </div>
          </div>

          <div className={styles.ctaRow}>
            <Link to="/orders" className={styles.ctaPrimary}>View Orders →</Link>
            <Link to="/scorecard" className={styles.ctaSecondary}>Open Scorecard</Link>
          </div>

          <div className={styles.heroStats}>
            <span><strong className={styles.heroStatStrong}>{orders.toLocaleString()}</strong> orders analyzed</span>
            <span className={styles.heroStatDivider}>·</span>
            <span><strong style={{ color: "#3fb950" }}>₹{recovered.toLocaleString()}</strong> recovered</span>
            <span className={styles.heroStatDivider}>·</span>
            <span><strong style={{ color: "#f85149" }}>{rate}%</strong> false claim rate</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionEyebrow color="#f85149">The COD Problem</SectionEyebrow>
          <h2 className={styles.sectionH2}>India's COD economy is bleeding — and no one sees it in real time.</h2>
          <div className={styles.grid320}>
            <ProblemCard accent="#f85149" title="Delivery theft & false claims"
              body="Couriers mark COD orders as 'customer unavailable' without attempting delivery, then pocket the cash. Platforms eat the refund and never learn who's cheating." />
            <ProblemCard accent="#d29922" title="Silent hub delays"
              body="Packages stall for days at congested hubs. No proactive customer comms → cancellations, RTO fees, and eroded NPS." />
            <ProblemCard accent="#8b949e" title="No operational visibility"
              body="Ops teams learn about problems from support tickets, days late. Root-cause analysis lives in spreadsheets, not decisions." />
          </div>

          <div className={styles.spacer4} />

          <SectionEyebrow color="#3fb950">The Sanchar Solution</SectionEyebrow>
          <h2 className={styles.sectionH2}>One AI pipeline. Every order. Real-time recovery.</h2>
          <div className={styles.grid320}>
            <SolutionCard icon="🎯" title="Catch stalls before customers do"
              body="Continuous monitoring flags anomalies against expected transit time — often hours before a support ticket." />
            <SolutionCard icon="🔬" title="Separate fraud from friction"
              body="Diagnosis cross-checks GPS, call logs, and hub scans to distinguish genuine delays from courier false claims — with a confidence score." />
            <SolutionCard icon="⚙️" title="Automated, per-order action"
              body="The right response every time: proactive SMS, wallet credit, courier invoice, reassignment, or free reshipment." />
          </div>
        </div>
      </section>

      <section className={styles.howSection}>
        <div className={styles.sectionInner}>
          <SectionEyebrow color="#58a6ff">How it works</SectionEyebrow>
          <h2 className={styles.sectionH2}>Four agents. One pipeline. Every COD order.</h2>
          <div className={styles.agentDetailGrid}>
            {AGENTS.map((a, i) => (
              <div key={a.key} className={styles.agentDetailCard}
                style={{ background: a.bg, border: `1px solid ${a.border}` }}>
                <div aria-hidden className={styles.agentDetailGlow}
                  style={{ background: `radial-gradient(circle, ${a.color}22, transparent 70%)` }} />
                <div className={styles.agentDetailContent}>
                  <div className={styles.agentDetailHeader}>
                    <span className={styles.agentDetailIcon}>{a.icon}</span>
                    <span className={styles.agentDetailNumber} style={{ color: a.color }}>0{i + 1}</span>
                  </div>
                  <h3 className={styles.agentDetailTitle} style={{ color: a.color }}>{a.label} Agent</h3>
                  <p className={styles.agentDetailBody}>{a.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionEyebrow color="#d29922">Batch Intelligence</SectionEyebrow>
          <h2 style={{ ...sectionH2, margin: "0.5rem 0 1rem" }}>See the bigger picture.</h2>
          <p className={styles.batchDesc}>
            Sanchar analyzes patterns across every order to give you actionable operations
            intelligence — not just per-order fixes.
          </p>
          <div className={styles.batchGrid}>
            {[
              { icon: "📊", color: "#58a6ff", title: "Root cause trends",
                body: "What's actually causing delays across all hubs — weather, congestion, address gaps, or courier behavior." },
              { icon: "🗺️", color: "#d29922", title: "Regional risk map",
                body: "Which cities need different operational responses, staffing, or courier partner mixes." },
              { icon: "💰", color: "#3fb950", title: "Financial impact",
                body: "Cumulative ₹ saved by catching false claims and preventing avoidable RTOs — tracked in real time." },
              { icon: "🚨", color: "#f85149", title: "False claim hotspots",
                body: "Regions and courier partners with the highest fraud rates, ranked so ops can act." },
            ].map((item) => (
              <div key={item.title} className={styles.batchCard} style={{ borderTop: `2px solid ${item.color}` }}>
                <div className={styles.batchCardIcon}>{item.icon}</div>
                <h3 className={styles.batchCardTitle} style={{ color: item.color }}>{item.title}</h3>
                <p className={styles.batchCardBody}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionEyebrow color="#3fb950">Impact</SectionEyebrow>
          <h2 className={styles.sectionH2}>Last 30 days across the network.</h2>
          <div className={styles.impactGrid}>
            <ImpactStat label="Orders processed" value={orders.toLocaleString()} color="#e6edf3" />
            <ImpactStat label="False claims caught" value={falseClaims.toLocaleString()} color="#f85149" />
            <ImpactStat label="Net financial impact" value={`₹${recovered.toLocaleString()}`} color="#3fb950" />
            <ImpactStat label="False claim rate" value={`${rate}%`} color="#d29922" />
          </div>
          <div className={styles.impactCta}>
            <Link to="/scorecard" className={styles.impactCtaLink}>See the full Operations Scorecard →</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        Sanchar · संचार · <em>the journey.</em>
      </footer>
    </div>
  );
}

const sectionH2 = {
  margin: "0.5rem 0 3rem", fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
  fontWeight: 700, letterSpacing: "-0.02em", maxWidth: 760,
};

function SectionEyebrow({ children, color }) {
  return (
    <div className={styles.eyebrow} style={{ color }}>
      <span className={styles.eyebrowLine} style={{ background: color }} />
      {children}
    </div>
  );
}

function ProblemCard({ accent, title, body }) {
  return (
    <div className={styles.problemCard} style={{ borderLeft: `3px solid ${accent}` }}>
      <h3 className={styles.problemCardTitle}>{title}</h3>
      <p className={styles.problemCardBody}>{body}</p>
    </div>
  );
}

function SolutionCard({ icon, title, body }) {
  return (
    <div className={styles.solutionCard}>
      <div className={styles.solutionCardIcon}>{icon}</div>
      <h3 className={styles.solutionCardTitle}>{title}</h3>
      <p className={styles.solutionCardBody}>{body}</p>
    </div>
  );
}

function ImpactStat({ label, value, color }) {
  return (
    <div className={styles.impactCard}>
      <div className={styles.impactLabel}>{label}</div>
      <div className={styles.impactValue} style={{ color }}>{value}</div>
    </div>
  );
}
