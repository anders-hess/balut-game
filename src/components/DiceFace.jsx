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

  // Scandinavian Warmth: white body / ink dots unheld; terracotta body / white dots held
  const bodyFill  = held ? '#c97a4a' : '#ffffff';
  const bodyStroke = held ? 'none' : '#ece3cf';
  const pipFill   = held ? 'rgba(255,255,255,0.95)' : 'rgba(42,38,32,0.85)';

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
        <filter id={`shadow-${gradId}`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.08)" />
        </filter>
      </defs>

      {/* Die body */}
      <rect
        x="3" y="3" width="94" height="94"
        rx="22" ry="22"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth="1.5"
        filter={`url(#shadow-${gradId})`}
      />

      {/* Pips */}
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={7.5} fill={pipFill} />
      ))}
    </svg>
  );
}
