/** Self-authored PARALLAX X wordmark: flat copper orbital X + geometric sans text. No glow, no gradient. */
const COPPER = "#C66A4B";
const INK = "#F3F1ED";

function OrbitalX({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="20" cy="20" rx="18" ry="7" transform="rotate(-24 20 20)" fill="none" stroke={COPPER} strokeWidth="1.8" />
      <path d="M12.5 12.5 L27.5 27.5 M27.5 12.5 L12.5 27.5" fill="none" stroke={COPPER} strokeWidth="4.2" strokeLinecap="square" />
    </g>
  );
}

export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <OrbitalX />
    </svg>
  );
}

/** Reads "PARALLAX X": the word, then the orbital X as the final letter. */
export function Wordmark({ onClick, height = 30 }: { onClick?: () => void; height?: number }) {
  const content = (
    <svg viewBox="0 0 196 40" height={height} className="block" role="img" aria-label="PARALLAX X">
      <text
        x="0"
        y="28"
        fill={INK}
        style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 600, fontSize: 21, letterSpacing: 3.4 }}
      >
        PARALLAX
      </text>
      <OrbitalX x={152} />
    </svg>
  );
  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="-m-1 rounded-[8px] p-1" aria-label="PARALLAX X — back to site selection">
      {content}
    </button>
  );
}
