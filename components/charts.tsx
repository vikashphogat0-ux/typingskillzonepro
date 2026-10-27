import type { KeyStat } from "@/lib/analytics";

interface Series { label: string; color: string; values: number[] }

export function LineChart({ labels, series, height = 180, yMax, marks = [] }: { labels: string[]; series: Series[]; height?: number; yMax?: number; marks?: number[] }) {
  const W = 640, H = height, L = 36, B = 22, T = 10, R = 10;
  const max = yMax ?? Math.max(10, ...series.flatMap((s) => s.values));
  const x = (i: number) => L + (labels.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.label).join(" and ")} className="chart">
      {[0, 0.5, 1].map((f) => (
        <g key={f}><line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" opacity=".15" /><text x={L - 6} y={y(max * f) + 4} fontSize="11" textAnchor="end" fill="currentColor">{Math.round(max * f)}</text></g>
      ))}
      {marks.map((i) => <rect key={i} x={x(i) - 10} y={T} width="20" height={H - T - B} fill="#c0182b" opacity=".12" />)}
      {series.map((s) => (
        <g key={s.label}>
          <polyline fill="none" stroke={s.color} strokeWidth="2.5" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={s.color} />)}
        </g>
      ))}
      {labels.map((l, i) => <text key={i} x={x(i)} y={H - 5} fontSize="11" textAnchor="middle" fill="currentColor">{l}</text>)}
    </svg>
  );
}

const ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** Keyboard heatmap for Latin text; other scripts get a ranked list. */
export function KeyHeatmap({ keys, hindi }: { keys: Record<string, KeyStat>; hindi: boolean }) {
  const tint = (s?: KeyStat) => (!s || !s.attempts ? "var(--board)" : s.errors === 0 ? "var(--greenbg)" : `rgba(192,24,43,${Math.min(0.9, 0.2 + (s.errors / s.attempts) * 1.4)})`);
  if (hindi) {
    const top = Object.entries(keys).filter(([, s]) => s.errors > 0).sort((a, b) => b[1].errors - a[1].errors).slice(0, 12);
    return <div className="chips">{top.length ? top.map(([k, s]) => <span key={k} style={{ background: tint(s) }}>{k} <small>{s.errors}/{s.attempts}</small></span>) : <p className="hint">No weak characters found.</p>}</div>;
  }
  return (
    <div className="kb" role="img" aria-label="Keyboard heatmap of mistakes">
      {ROWS.map((r, i) => (
        <div key={r} className="kb-row" style={{ marginLeft: i * 14 }}>
          {r.split("").map((k) => <span key={k} style={{ background: tint(keys[k]) }} title={keys[k] ? `${keys[k].errors} wrong of ${keys[k].attempts}` : "not used"}>{k}</span>)}
        </div>
      ))}
    </div>
  );
}
