// Inline SVG sparkline with theme-aware colors (uses CSS vars via currentColor
// and stroke classes). Null response times break the line into segments and
// render as red dots on the baseline so failures are always visible.
//
// Adds a subtle area gradient fill under the line to feel less "graph paper".

interface Point {
  t: string;
  rt: number | null;
  ok: boolean;
}

interface SparklineProps {
  data: Point[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 600, height = 80 }: SparklineProps) {
  if (data.length === 0) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
      >
        No data yet
      </div>
    );
  }

  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const rts = data.map((d) => d.rt).filter((v): v is number => v !== null);
  const maxRt = rts.length > 0 ? Math.max(...rts) : 1;
  const minRt = rts.length > 0 ? Math.min(...rts) : 0;
  const range = Math.max(maxRt - minRt, 1);

  const x = (i: number) => pad + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (rt: number) => pad + innerH - ((rt - minRt) / range) * innerH;

  // Split into segments on null so we don't paint a line through failures.
  const segments: { points: string[]; fill: string }[] = [];
  let current: string[] = [];
  let firstX: number | null = null;
  data.forEach((d, i) => {
    if (d.rt !== null) {
      if (firstX === null) firstX = x(i);
      current.push(`${x(i)},${y(d.rt)}`);
    } else if (current.length > 0) {
      // Close this segment's fill to the baseline.
      const lastX = Number(current[current.length - 1]!.split(',')[0]!);
      const fill = `M${firstX},${pad + innerH} L${current.join(' L')} L${lastX},${pad + innerH} Z`;
      segments.push({ points: current, fill });
      current = [];
      firstX = null;
    }
  });
  if (current.length > 0 && firstX !== null) {
    const lastX = Number(current[current.length - 1]!.split(',')[0]!);
    const fill = `M${firstX},${pad + innerH} L${current.join(' L')} L${lastX},${pad + innerH} Z`;
    segments.push({ points: current, fill });
  }

  const failurePoints = data
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !d.ok)
    .map(({ d, i }) => ({ cx: x(i), cy: d.rt !== null ? y(d.rt) : pad + innerH }));

  const gradientId = 'sparkline-gradient';

  return (
    <svg width={width} height={height} className="block text-primary">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {segments.map((seg, i) => (
        <g key={i}>
          <path d={seg.fill} fill={`url(#${gradientId})`} stroke="none" />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={seg.points.join(' ')}
          />
        </g>
      ))}
      {failurePoints.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={3} className="fill-bad" />
      ))}
    </svg>
  );
}
