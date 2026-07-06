import type { MetricPoint } from '../types';

interface MiniLineChartProps {
  points: MetricPoint[];
  label: string;
}

export function MiniLineChart({ points, label }: MiniLineChartProps) {
  const width = 240;
  const height = 86;
  const padding = 10;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
    return { x, y, point };
  });

  const path = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const areaPath = `${coordinates[0]?.x ?? padding},${height - padding} ${path} ${coordinates.at(-1)?.x ?? width - padding},${height - padding}`;

  return (
    <svg className="mini-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline className="mini-line-chart-area" points={areaPath} />
      <polyline className="mini-line-chart-line" points={path} />
      {coordinates.map(({ x, y, point }) => (
        <circle className="mini-line-chart-dot" cx={x} cy={y} r="3" key={`${point.x}-${point.value}`} />
      ))}
    </svg>
  );
}
