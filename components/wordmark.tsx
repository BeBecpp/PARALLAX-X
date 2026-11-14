/** Self-authored PARALLAX X wordmark: flat copper orbital X + geometric sans text. No glow, no gradient. */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <ellipse cx="20" cy="20" rx="17.5" ry="7" transform="rotate(-24 20 20)" fill="none" stroke="#C97951" strokeWidth="2" />
      <path d="M12 12 L28 28 M28 12 L12 28" fill="none" stroke="#C97951" strokeWidth="4.5" strokeLinecap="square" />
    </svg>
  );
}

export function Wordmark({ onClick }: { onClick?: () => void }) {
  const content = (
    <svg viewBox="0 0 196 40" height={30} className="block" role="img" aria-label="PARALLAX X">
      <ellipse cx="20" cy="20" rx="17.5" ry="7" transform="rotate(-24 20 20)" fill="none" stroke="#C97951" strokeWidth="2" />
      <path d="M12 12 L28 28 M28 12 L12 28" fill="none" stroke="#C97951" strokeWidth="4.5" strokeLinecap="square" />
      <text
        x="48"
        y="28"
        fill="#EAF0F4"
        style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 600, fontSize: 21, letterSpacing: 3.6 }}
      >
        PARALLAX
      </text>
    </svg>
  );
  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="rounded-[8px] p-1 -m-1" aria-label="PARALLAX X — back to site selection">
      {content}
    </button>
  );
}
