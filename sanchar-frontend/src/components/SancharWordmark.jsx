import styles from "../styles/SancharWordmark.module.css";

export default function SancharWordmark({ size = 20, showTagline = false, glow = false }) {
  const iconSize = size * 1.6;
  const textShadow = glow ? "0 0 20px rgba(88,166,255,0.4)" : "none";

  return (
    <div className={styles.container}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wmg" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="#58a6ff" />
            <stop offset="100%" stopColor="#3fb950" />
          </linearGradient>
          <filter id="wmg-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M6 10l10-5 10 5v12l-10 5-10-5V10z" stroke="url(#wmg)" strokeWidth="2" fill="none" />
        <circle cx="10" cy="16" r="2" fill="#58a6ff" />
        <circle cx="16" cy="20" r="2" fill="#d29922" />
        <circle cx="22" cy="16" r="2" fill="#3fb950" />
        <path d="M11.8 16L14.2 18.5" stroke="#58a6ff" strokeWidth="1.5" />
        <path d="M17.8 18.5L20.2 16" stroke="#3fb950" strokeWidth="1.5" />
        <path d="M20.8 15.5l1.5 1-1.5 1" stroke="#3fb950" strokeWidth="1.2" fill="none" />
      </svg>
      <div className={styles.textGroup}>
        <span className={styles.brandText} style={{ fontSize: size, textShadow }}>
          Sanchar
        </span>
        {showTagline && (
          <div className={styles.tagline} style={{ fontSize: size * 0.55 }}>
            AI-Powered Logistics Intelligence
          </div>
        )}
      </div>
    </div>
  );
}
