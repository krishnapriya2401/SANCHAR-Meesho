export default function SancharLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#58a6ff" />
          <stop offset="100%" stopColor="#3fb950" />
        </linearGradient>
      </defs>
      {/* Package/box shape forming S */}
      <path d="M6 10l10-5 10 5v12l-10 5-10-5V10z" stroke="url(#sg)" strokeWidth="1.8" fill="none" />
      {/* Pipeline dots */}
      <circle cx="10" cy="16" r="1.8" fill="#58a6ff" />
      <circle cx="16" cy="20" r="1.8" fill="#d29922" />
      <circle cx="22" cy="16" r="1.8" fill="#3fb950" />
      {/* Connector lines */}
      <path d="M11.8 16L14.2 18.5" stroke="#30363d" strokeWidth="1.2" />
      <path d="M17.8 18.5L20.2 16" stroke="#30363d" strokeWidth="1.2" />
      {/* Arrowhead on the flow */}
      <path d="M20.8 15.5l1.5 1-1.5 1" stroke="#3fb950" strokeWidth="1" fill="none" />
    </svg>
  );
}
