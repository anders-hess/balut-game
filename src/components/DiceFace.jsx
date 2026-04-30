const PIP_POSITIONS = {
  1: [[50, 50]],
  2: [[70, 30], [30, 70]],
  3: [[70, 30], [50, 50], [30, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
};

// dieIndex makes each gradient ID unique so dice showing the same value
// don't share (and potentially clobber) each other's SVG gradient definitions.
export default function DiceFace({ value, size = 64, held = false, dieIndex = 0 }) {
  const pips   = PIP_POSITIONS[value] ?? [];
  const gradId = `dg-${dieIndex}-${held ? 1 : 0}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Die showing ${value}`}
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={held ? '#fff8c0' : '#ffffff'} stopOpacity="0.9" />
          <stop offset="100%" stopColor={held ? '#f0d060' : '#f0ece4'} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Die body */}
      <rect
        x="3" y="3" width="94" height="94"
        rx="15" ry="15"
        fill={`url(#${gradId})`}
        stroke={held ? '#c9a84c' : '#c8b898'}
        strokeWidth="2.5"
      />
      {/* Inner highlight edge */}
      <rect
        x="3" y="3" width="94" height="94"
        rx="15" ry="15"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1"
      />
      {/* Pips */}
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={7.5} fill={held ? '#5a3800' : '#1a1008'} />
      ))}
    </svg>
  );
}
