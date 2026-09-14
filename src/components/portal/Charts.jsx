import { peso } from '../../lib/config.js';

// ---------- DONUT / PIE ----------
export function Donut({ data, size = 200, thickness = 34 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="chart-empty" style={{ height: size }}>No data yet</div>
    );
  }

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef0f3" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const seg = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} />
          );
          offset += dash;
          return seg;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="donut-center-num">{data.length}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="donut-center-label">segments</text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div className="donut-legend-item" key={i}>
            <span className="donut-swatch" style={{ background: d.color }} />
            <span className="donut-legend-label">{d.label}</span>
            <span className="donut-legend-val">{d.isMoney ? peso(d.value) : d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- LINE CHART ----------
export function LineChart({ points, height = 220, color = 'var(--navy)', fill = 'rgba(0,38,77,0.08)', money = true }) {
  const w = 640;
  const pad = { t: 20, r: 20, b: 40, l: 56 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;

  const xy = points.map((p, i) => ({
    x: pad.l + i * stepX,
    y: pad.t + innerH - (p.value / max) * innerH,
    ...p,
  }));
  const path = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${xy[xy.length - 1].x} ${pad.t + innerH} L ${xy[0].x} ${pad.t + innerH} Z`;

  return (
    <div className="line-chart-scroll">
      <svg viewBox={`0 0 ${w} ${height}`} className="line-chart" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
          const y = pad.t + innerH - g * innerH;
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#eef0f3" strokeWidth="1" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="axis-text">
                {money ? '₱' + Math.round(max * g / 1000) + 'k' : Math.round(max * g)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {xy.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2.5" />
            <text x={p.x} y={height - 22} textAnchor="middle" className="axis-text axis-x">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---------- MULTI-LINE CHART with legend ----------
export function MultiLineChart({ series, labels, height = 260, money = false }) {
  // series: [{ name, color, values: [] }], labels: x-axis labels
  const w = 680;
  const pad = { t: 20, r: 24, b: 42, l: 52 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const allVals = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allVals);
  const n = labels.length;
  const stepX = n > 1 ? innerW / (n - 1) : innerW;
  const fmt = (v) => (money ? '₱' + (v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)) : Math.round(v));

  const uid = Math.random().toString(36).slice(2, 7);

  return (
    <div className="mlc">
      <div className="mlc-legend">
        {series.map((s) => (
          <div className="mlc-legend-item" key={s.name}>
            <span className="mlc-swatch" style={{ background: s.color }} />{s.name}
          </div>
        ))}
      </div>
      <div className="line-chart-scroll">
        <svg viewBox={`0 0 ${w} ${height}`} className="line-chart" preserveAspectRatio="xMidYMid meet">
          <defs>
            {series.map((s, si) => (
              <linearGradient key={si} id={`grad-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {/* gridlines + y labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
            const y = pad.t + innerH - g * innerH;
            return (
              <g key={i}>
                <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#eef0f3" strokeWidth="1" />
                <text x={pad.l - 8} y={y + 3} textAnchor="end" className="axis-text">{fmt(max * g)}</text>
              </g>
            );
          })}
          {/* x labels */}
          {labels.map((lb, i) => (
            <text key={i} x={pad.l + i * stepX} y={height - 22} textAnchor="middle" className="axis-text axis-x">{lb}</text>
          ))}
          {/* each series */}
          {series.map((s, si) => {
            const xy = s.values.map((v, i) => ({ x: pad.l + i * stepX, y: pad.t + innerH - (v / max) * innerH, v }));
            const path = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const area = `${path} L ${xy[xy.length - 1].x} ${pad.t + innerH} L ${xy[0].x} ${pad.t + innerH} Z`;
            return (
              <g key={si}>
                <path d={area} fill={`url(#grad-${uid}-${si})`} />
                <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {xy.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2" />)}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---------- GROUPED HORIZONTAL BARS (revenue vs expense vs net per duration) ----------
export function DurationPL({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.revenue, r.expense, Math.abs(r.net)]));
  return (
    <div className="pl-list">
      {rows.map((r) => (
        <div className="pl-row" key={r.label}>
          <div className="pl-label">{r.label}</div>
          <div className="pl-bars">
            <div className="pl-bar-line">
              <span className="pl-tag rev">Revenue</span>
              <div className="pl-track"><div className="pl-fill rev" style={{ width: `${(r.revenue / max) * 100}%` }} /></div>
              <span className="pl-val">{peso(r.revenue)}</span>
            </div>
            <div className="pl-bar-line">
              <span className="pl-tag exp">Expense</span>
              <div className="pl-track"><div className="pl-fill exp" style={{ width: `${(r.expense / max) * 100}%` }} /></div>
              <span className="pl-val">{peso(r.expense)}</span>
            </div>
            <div className="pl-bar-line">
              <span className="pl-tag net">Net</span>
              <div className="pl-track"><div className={'pl-fill ' + (r.net >= 0 ? 'net' : 'neg')} style={{ width: `${(Math.abs(r.net) / max) * 100}%` }} /></div>
              <span className={'pl-val ' + (r.net >= 0 ? '' : 'neg-text')}>{peso(r.net)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
