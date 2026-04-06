import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
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

function CustomTooltip({ active, payload, label, hiddenPlayers }) {
  if (!active || !payload?.length) return null;
  const hidden = hiddenPlayers ?? new Set();
  const rows = [...payload]
    .filter(
      (p) =>
        typeof p.value === "number" &&
        p.dataKey != null &&
        !hidden.has(String(p.dataKey))
    )
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

function PlayerLegend({ topPlayers, hiddenPlayers, onToggle, onShowAll }) {
  const hiddenCount = hiddenPlayers.size;
  return (
    <div className="scorers-chart__legend">
      <p className="scorers-chart__legend-hint">
        Click a name to add or remove them from the chart
      </p>
      <ul className="scorers-chart__legend-list" role="list">
        {topPlayers.map((player, i) => {
          const hidden = hiddenPlayers.has(player);
          const color = PLAYER_STROKES[i % PLAYER_STROKES.length];
          return (
            <li key={player}>
              <button
                type="button"
                className={`scorers-chart__legend-chip${hidden ? " is-hidden" : ""}`}
                onClick={() => onToggle(player)}
                aria-pressed={!hidden}
                aria-label={
                  hidden
                    ? `Show ${getDisplayName(player)} on chart`
                    : `Hide ${getDisplayName(player)} from chart`
                }
              >
                <span
                  className="scorers-chart__legend-chip-swatch"
                  style={{
                    background: color,
                    opacity: hidden ? 0.35 : 1,
                  }}
                  aria-hidden
                />
                <span className="scorers-chart__legend-chip-label">
                  {getDisplayName(player)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="scorers-chart__legend-reset"
          onClick={onShowAll}
        >
          Show all ({topPlayers.length})
        </button>
      ) : null}
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

  const topPlayersKey = built?.topPlayers?.join("\0") ?? "";
  const [hiddenPlayers, setHiddenPlayers] = useState(() => new Set());

  useEffect(() => {
    setHiddenPlayers(new Set());
  }, [topPlayersKey]);

  const togglePlayer = useCallback((name) => {
    setHiddenPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const showAllPlayers = useCallback(() => {
    setHiddenPlayers(new Set());
  }, []);

  if (!built) {
    return (
      <div className="scorers-chart scorers-chart--empty">
        <p>No scorer data available for this configuration.</p>
      </div>
    );
  }

  const { chartData, topPlayers, seasonLabel, dataSeasons } = built;
  const visiblePlayers = topPlayers.filter((p) => !hiddenPlayers.has(p));
  const maxGoals = Math.max(
    1,
    ...visiblePlayers.map((p) => chartData[chartData.length - 1]?.[p] ?? 0)
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

      <PlayerLegend
        topPlayers={topPlayers}
        hiddenPlayers={hiddenPlayers}
        onToggle={togglePlayer}
        onShowAll={showAllPlayers}
      />

      <div className="scorers-chart__canvas-wrap">
        <div className="scorers-chart__grid-bg" aria-hidden />
        {visiblePlayers.length === 0 ? (
          <div className="scorers-chart__chart-empty" role="status">
            <p>Every player is hidden. Turn at least one name on above.</p>
          </div>
        ) : (
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
                content={(props) => (
                  <CustomTooltip {...props} hiddenPlayers={hiddenPlayers} />
                )}
                cursor={{
                  stroke: "var(--scorers-chart-cursor)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              {topPlayers.map((player, i) => {
                if (hiddenPlayers.has(player)) return null;
                return (
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
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
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
