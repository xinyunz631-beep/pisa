import type { TrendPoint } from '../types';
import { compactMoney, money } from '../utils/format';

interface Props {
  data: TrendPoint[];
}

const W = 720;
const H = 260;
const PAD = { top: 20, right: 20, bottom: 42, left: 56 };

/** 无依赖的 SVG 面积折线图（原型阶段避免引入图表库）。 */
export default function TrendChart({ data }: Props) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const yMax = max * 1.15;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = data.length > 1 ? plotW / (data.length - 1) : plotW;

  const points = data.map((d, i) => ({
    ...d,
    x: PAD.left + i * step,
    y: PAD.top + plotH * (1 - d.value / yMax),
  }));

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${PAD.top + plotH} L${points[0].x.toFixed(1)},${PAD.top + plotH} Z`;

  const ticks = 4;
  const gridYs = Array.from({ length: ticks + 1 }, (_, i) => PAD.top + (plotH / ticks) * i);
  const gridValue = (i: number) => yMax * (1 - i / ticks);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label="近 7 日营业额趋势"
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4380d" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#d4380d" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridYs.map((y, i) => (
        <g key={y}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y}
            y2={y}
            stroke="#f0f0f0"
            strokeDasharray={i === ticks ? '0' : '4 4'}
          />
          <text x={PAD.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(0,0,0,0.45)">
            {compactMoney(Math.round(gridValue(i)))}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#trend-fill)" />
      <path d={line} fill="none" stroke="#d4380d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#d4380d" strokeWidth="2.5">
            <title>
              {p.label}：{money(p.value)}
            </title>
          </circle>
          <text x={p.x} y={H - 16} textAnchor="middle" fontSize="11" fill="rgba(0,0,0,0.45)">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
