import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { config } from "../../leaderboard-config.js";
import { buildScorersChartData } from "../../utils/scorers-chart-data.js";
import { getDisplayName } from "../../utils/playerDisplayName.js";
import "./ScorersChart.css";

/** Distinct strokes that read well on dark and light shells */
const PLAYER_STROKES = [
  "#22d3ee",
  "#c084fc",
  "#fb7185",
  "#fbbf24",
  "#4ade80",
  "#60a5fa",
  "#f97316",
  "#2dd4bf",
  "#e879f9",
  "#a3e635",
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const rows = [...payload]
    .filter((p) => typeof p.value === "number")
    .sort((a, b) => b.value - a.value);
  if (rows.length === 0) return null;

  return (
    <div className="scorers-chart-tooltip">
      <div className="scorers-chart-tooltip__title">{label}</div>
      <ul className="scorers-chart-tooltip__list">
        {rows.map((p) => (
          <li key={String(p.dataKey)} className="scorers-chart-tooltip__item">
            <span
              className="scorers-chart-tooltip__swatch"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="scorers-chart-tooltip__name">
              {getDisplayName(p.dataKey)}
            </span>
            <span className="scorers-chart-tooltip__value">
              {p.value}
              <span className="scorers-chart-tooltip__suffix"> goals</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScorersChart() {
  const chartCfg = config.SCORERS_CHART || {};
  const dataSeason = chartCfg.dataSeason;
  const topN = chartCfg.topN ?? 10;

  const built = useMemo(
    () => buildScorersChartData({ dataSeason, topN }),
    [dataSeason, topN]
  );

  if (!built) {
    return (
      <div className="scorers-chart scorers-chart--empty">
        <p>No scorer data available for this configuration.</p>
      </div>
    );
  }

  const { chartData, topPlayers, seasonLabel, dataSeasons } = built;
  const maxGoals = Math.max(
    1,
    ...topPlayers.map((p) => chartData[chartData.length - 1]?.[p] ?? 0)
  );
  const yUpper = Math.ceil(maxGoals * 1.08);

  return (
    <div className="scorers-chart">
      <header className="scorers-chart__header">
        <div className="scorers-chart__headline">
          <h2 className="scorers-chart__title">Race to the golden boot</h2>
          <p className="scorers-chart__subtitle">
            {dataSeasons.length > 1 ? "Seasons " : "Season "}
            {seasonLabel} · Top {topPlayers.length} by total goals · Cumulative
            goals per week (Monday–Sunday)
          </p>
        </div>
        <div className="scorers-chart__badge" aria-hidden>
          <span className="scorers-chart__badge-glow" />
          <span className="scorers-chart__badge-inner">Live season arc</span>
        </div>
      </header>

      <div className="scorers-chart__canvas-wrap">
        <div className="scorers-chart__grid-bg" aria-hidden />
        <ResponsiveContainer width="100%" height={460} debounce={50}>
          <LineChart
            data={chartData}
            margin={{ top: 16, right: 8, left: 0, bottom: 8 }}
          >
            <defs>
              <filter
                id="scorers-chart-glow"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              stroke="var(--scorers-chart-grid)"
              strokeDasharray="4 10"
              vertical={false}
            />
            <XAxis
              dataKey="weekLabel"
              tick={{ fill: "var(--scorers-chart-axis)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--scorers-chart-axis-line)" }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={[0, yUpper]}
              allowDecimals={false}
              tick={{ fill: "var(--scorers-chart-axis)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--scorers-chart-axis-line)" }}
              width={36}
              label={{
                value: "Cumulative goals",
                angle: -90,
                position: "insideLeft",
                offset: 8,
                style: {
                  fill: "var(--scorers-chart-axis-muted)",
                  fontSize: 11,
                  fontWeight: 600,
                },
              }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "var(--scorers-chart-cursor)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={52}
              formatter={(value) => (
                <span className="scorers-chart__legend-label">
                  {getDisplayName(value)}
                </span>
              )}
              wrapperStyle={{ paddingTop: 18 }}
            />
            {topPlayers.map((player, i) => (
              <Line
                key={player}
                type="monotone"
                dataKey={player}
                name={player}
                stroke={PLAYER_STROKES[i % PLAYER_STROKES.length]}
                strokeWidth={2.75}
                dot={false}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  stroke: "var(--bg-card)",
                  filter: "url(#scorers-chart-glow)",
                }}
                connectNulls
                isAnimationActive
                animationDuration={1200}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <footer className="scorers-chart__footer">
        <span className="scorers-chart__foot-note">
          Weeks with at least one played league match · Data source:{" "}
          {dataSeasons.map((y, i) => (
            <span key={y}>
              {i > 0 ? ", " : null}
              <code>{y}.json</code>
            </span>
          ))}
        </span>
      </footer>
    </div>
  );
}
