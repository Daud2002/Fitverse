"use client";

// Lightweight dependency-free SVG charts for the admin dashboard.

const PALETTE = ["#6c5ce7", "#4a6cf7", "#8b5cf6", "#22c55e", "#f97316", "#ec4899", "#06b6d4"];

// Smooth-ish area + line chart for a daily trend with two series.
export function TrendChart({ data, series }) {
  const W = 640;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 26, left: 30 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key])));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const x = (i) => PAD.left + i * stepX;
  const y = (v) => PAD.top + innerH - (v / max) * innerH;

  const lineFor = (key) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[key])}`).join(" ");
  const areaFor = (key) =>
    `${lineFor(key)} L ${x(data.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`;

  // y-axis gridlines (4 steps)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img">
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE[si]} stopOpacity="0.28" />
              <stop offset="100%" stopColor={PALETTE[si]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t, i) => {
          const gy = y(t);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy} stroke="#eceef5" strokeWidth="1" />
              <text x={PAD.left - 6} y={gy + 4} textAnchor="end" fontSize="10" fill="#9aa1ad">{t}</text>
            </g>
          );
        })}

        {series.map((s, si) => (
          <g key={s.key}>
            <path d={areaFor(s.key)} fill={`url(#grad-${s.key})`} />
            <path d={lineFor(s.key)} fill="none" stroke={PALETTE[si]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d[s.key])} r="2.6" fill="#fff" stroke={PALETTE[si]} strokeWidth="2" />
            ))}
          </g>
        ))}

        {/* x labels: show ~every other day to avoid crowding */}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#9aa1ad">
              {d.date.slice(5)}
            </text>
          ) : null
        )}
      </svg>
      <div className="chart-legend">
        {series.map((s, si) => (
          <span key={s.key} className="legend-item">
            <i style={{ background: PALETTE[si] }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Donut chart for a categorical breakdown.
export function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 168;
  const r = 62;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = total ? d.value / total : 0;
    const seg = { ...d, color: PALETTE[i % PALETTE.length], dash: frac * circ, offset };
    offset += frac * circ;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eceef5" strokeWidth="18" />
        {total > 0 &&
          segments.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          ))}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="26" fontWeight="800" fill="#1a1a2e">{total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#9aa1ad">total</text>
      </svg>
      <div className="donut-legend">
        {segments.map((s, i) => (
          <div key={i} className="legend-item">
            <i style={{ background: s.color }} />
            <span className="legend-label" style={{ textTransform: "capitalize" }}>{s.label}</span>
            <span className="legend-val">{s.value}</span>
          </div>
        ))}
        {total === 0 && <div className="muted" style={{ fontSize: 13 }}>No data yet.</div>}
      </div>
    </div>
  );
}

// Horizontal bar list for a categorical breakdown.
export function BarList({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="barlist">
      {data.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No data yet.</div>}
      {data.map((d, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label" style={{ textTransform: "capitalize" }}>{d.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
          </div>
          <span className="bar-val">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
