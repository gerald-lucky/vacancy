"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/utils";
import type { VacancySnapshot, Park } from "@/lib/types";

interface TrendDataPoint {
  week_date: string;
  [parkSlug: string]: number | string;
}

interface VacancyTrendChartProps {
  snapshots: VacancySnapshot[];
  parks: Park[];
  singlePark?: boolean;
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1",
  "#14b8a6", "#f43f5e", "#a78bfa", "#fb923c", "#34d399",
  "#60a5fa", "#fbbf24", "#e879f9", "#4ade80", "#38bdf8",
];

export function VacancyTrendChart({
  snapshots,
  parks,
  singlePark = false,
}: VacancyTrendChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data available yet. Upload your first report to see trends.
      </div>
    );
  }

  // Build a map: week_date → { [park_id]: vacancy_pct }
  const parkMap = new Map(parks.map((p) => [p.id, p]));
  const weekMap = new Map<string, TrendDataPoint>();

  for (const snap of snapshots) {
    if (!weekMap.has(snap.week_date)) {
      weekMap.set(snap.week_date, { week_date: snap.week_date });
    }
    const point = weekMap.get(snap.week_date)!;
    const park = parkMap.get(snap.park_id);
    if (park && snap.total_units > 0) {
      point[park.slug] = parseFloat(
        ((snap.vacant_units / snap.total_units) * 100).toFixed(1)
      );
    }
  }

  const chartData = Array.from(weekMap.values()).sort((a, b) =>
    String(a.week_date).localeCompare(String(b.week_date))
  );

  // In single-park mode, only show that park's line
  const visibleParks = singlePark ? parks.slice(0, 1) : parks;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="week_date"
          tickFormatter={(v) => formatDate(String(v))}
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={[0, "auto"]}
        />
        <Tooltip
          formatter={(value, name) => {
            const park = parks.find((p) => p.slug === name);
            return [`${value}%`, park?.name ?? String(name)];
          }}
          labelFormatter={(label) => `Week of ${formatDate(String(label))}`}
        />
        {!singlePark && <Legend formatter={(value) => parks.find((p) => p.slug === value)?.name ?? value} />}
        {visibleParks.map((park, i) => (
          <Line
            key={park.id}
            type="monotone"
            dataKey={park.slug}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={singlePark ? 2.5 : 1.5}
            dot={singlePark ? { r: 4 } : false}
            connectNulls
            name={park.slug}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
