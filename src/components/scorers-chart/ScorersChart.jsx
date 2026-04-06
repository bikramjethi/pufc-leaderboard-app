import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { config } from "../../leaderboard-config.js";
import {
  buildAllTimeTopScorersBarData,
  buildScorersChartData,
  getConfiguredScorersSeasons,
} from "../../utils/scorers-chart-data.js";
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

const SCOPE_ALL_TIME = "all-time";
const SCOPE_COMBINED = "all";

function defaultScopeFromConfig() {
  const s = getConfiguredScorersSeasons(config.SCORERS_CHART?.dataSeason);
  return s.length ? s[s.length - 1] : SCOPE_ALL_TIME;
}

function LineChartTooltip({ active, payload, label, hiddenPlayers }) {
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

function BarGoalsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const name = row?.payload?.playerKey;
  if (name == null) return null;
  return (
    <div className="scorers-chart-tooltip scorers-chart-tooltip--bar">
      <div className="scorers-chart-tooltip__title">
        {getDisplayName(name)}
      </div>
      <p className="scorers-chart-bar-tooltip__stat">
        <span className="scorers-chart-bar-tooltip__value">{row.value}</span>
        <span className="scorers-chart-bar-tooltip__suffix">
          {" "}
          career goals · all seasons
        </span>
      </p>
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
  const topN = chartCfg.topN ?? 10;

  const configuredSeasons = useMemo(
    () => getConfiguredScorersSeasons(chartCfg.dataSeason),
    [chartCfg.dataSeason]
  );
  const seasonsSig = configuredSeasons.join(",");

  const [scope, setScope] = useState(defaultScopeFromConfig);

  useEffect(() => {
    const latest =
      configuredSeasons[configuredSeasons.length - 1] ?? SCOPE_ALL_TIME;
    setScope(latest);
  }, [seasonsSig]);

  useEffect(() => {
    if (scope === SCOPE_COMBINED && configuredSeasons.length <= 1) {
      const latest =
        configuredSeasons[configuredSeasons.length - 1] ?? SCOPE_ALL_TIME;
      setScope(latest);
    }
    if (
      scope !== SCOPE_ALL_TIME &&
      scope !== SCOPE_COMBINED &&
      !configuredSeasons.includes(scope)
    ) {
      const latest =
        configuredSeasons[configuredSeasons.length - 1] ?? SCOPE_ALL_TIME;
      setScope(latest);
    }
  }, [scope, configuredSeasons]);

  const isAllTime = scope === SCOPE_ALL_TIME;

  const dataSeasonForBuild = useMemo(() => {
    if (isAllTime) return [];
    if (configuredSeasons.length <= 1) return configuredSeasons;
    if (scope === SCOPE_COMBINED) return configuredSeasons;
    return [scope];
  }, [configuredSeasons, scope, isAllTime]);

  const built = useMemo(() => {
    if (isAllTime) return null;
    return buildScorersChartData({ dataSeason: dataSeasonForBuild, topN });
  }, [isAllTime, dataSeasonForBuild, topN]);

  const barBuilt = useMemo(() => {
    if (!isAllTime) return null;
    return buildAllTimeTopScorersBarData(topN);
  }, [isAllTime, topN]);

  const topPlayersKey = isAllTime
    ? barBuilt?.topPlayers?.join("\0") ?? ""
    : built?.topPlayers?.join("\0") ?? "";

  const [hiddenPlayers, setHiddenPlayers] = useState(() => new Set());

  useEffect(() => {
    setHiddenPlayers(new Set());
  }, [topPlayersKey, scope]);

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

  if (isAllTime) {
    if (!barBuilt?.barData?.length) {
      return (
        <div className="scorers-chart scorers-chart--empty">
          <p>No all-time scorer data available.</p>
        </div>
      );
    }
  } else if (!built) {
    return (
      <div className="scorers-chart scorers-chart--empty">
        <p>No scorer data available for this configuration.</p>
      </div>
    );
  }

  const selectOptions = useMemo(() => {
    const opts = [{ value: SCOPE_ALL_TIME, label: "All-time (club totals)" }];
    if (configuredSeasons.length > 1) {
      opts.push({
        value: SCOPE_COMBINED,
        label: "All seasons combined",
      });
    }
    configuredSeasons.forEach((y) => {
      opts.push({ value: y, label: `${y} season` });
    });
    return opts;
  }, [configuredSeasons]);

  if (isAllTime) {
    const { barData, topPlayers, maxGoals } = barBuilt;
    const yMax = Math.max(1, Math.ceil(maxGoals * 1.12));

    return (
      <div className="scorers-chart scorers-chart--bar-mode">
        <header className="scorers-chart__header">
          <div className="scorers-chart__headline">
            <h2 className="scorers-chart__title scorers-chart__title--bar">
              All-time top scorers
            </h2>
            <p className="scorers-chart__subtitle">
              Top {topPlayers.length} career goals in PUFC · Bars left → right
              from lowest to highest in this group
            </p>
          </div>
          <div className="scorers-chart__badge" aria-hidden>
            <span className="scorers-chart__badge-glow" />
            <span className="scorers-chart__badge-inner">Club records</span>
          </div>
        </header>

        <div className="scorers-chart__season-bar scoring-trends-year-selector">
          <label htmlFor="scorers-chart-season-scope">View</label>
          <div className="select-wrapper">
            <select
              id="scorers-chart-season-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              {selectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>

        <div className="scorers-chart__canvas-wrap scorers-chart__canvas-wrap--bar">
          <div className="scorers-chart__grid-bg" aria-hidden />
          <ResponsiveContainer width="100%" height={480} debounce={50}>
            <BarChart
              data={barData}
              margin={{ top: 28, right: 12, left: 4, bottom: 88 }}
            >
              <defs>
                <filter
                  id="scorers-bar-glow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {barData.map((_, i) => (
                  <linearGradient
                    key={`g-${i}`}
                    id={`scorers-bar-grad-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={PLAYER_STROKES[i % PLAYER_STROKES.length]}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={PLAYER_STROKES[i % PLAYER_STROKES.length]}
                      stopOpacity={0.35}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                stroke="var(--scorers-chart-grid)"
                strokeDasharray="4 10"
                vertical={false}
              />
              <XAxis
                dataKey="playerKey"
                type="category"
                tick={{
                  fill: "var(--scorers-chart-axis)",
                  fontSize: 10,
                }}
                tickLine={false}
                axisLine={{ stroke: "var(--scorers-chart-axis-line)" }}
                tickFormatter={(v) => getDisplayName(v)}
                interval={0}
                angle={-32}
                textAnchor="end"
                height={78}
              />
              <YAxis
                domain={[0, yMax]}
                allowDecimals={false}
                tick={{ fill: "var(--scorers-chart-axis)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--scorers-chart-axis-line)" }}
                width={40}
                label={{
                  value: "Goals",
                  angle: -90,
                  position: "insideLeft",
                  offset: 4,
                  style: {
                    fill: "var(--scorers-chart-axis-muted)",
                    fontSize: 11,
                    fontWeight: 600,
                  },
                }}
              />
              <Tooltip
                content={<BarGoalsTooltip />}
                cursor={{
                  fill: "var(--scorers-chart-bar-cursor)",
                  radius: 8,
                }}
              />
              <Bar
                dataKey="goals"
                name="Goals"
                radius={[10, 10, 4, 4]}
                maxBarSize={56}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {barData.map((_, i) => (
                  <Cell
                    key={`c-${i}`}
                    fill={`url(#scorers-bar-grad-${i})`}
                    stroke={PLAYER_STROKES[i % PLAYER_STROKES.length]}
                    strokeWidth={1}
                    strokeOpacity={0.85}
                    style={{ filter: "url(#scorers-bar-glow)" }}
                  />
                ))}
                <LabelList
                  dataKey="goals"
                  position="top"
                  fill="var(--text-secondary)"
                  fontSize={11}
                  fontWeight={700}
                  offset={8}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <footer className="scorers-chart__footer">
          <span className="scorers-chart__foot-note">
            Career totals summed across every season in leaderboard data
            (excluding &quot;Others&quot;).
          </span>
        </footer>
      </div>
    );
  }

  const { chartData, topPlayers, seasonLabel, dataSeasons } = built;
  const visiblePlayers = topPlayers.filter((p) => !hiddenPlayers.has(p));
  const maxLineGoals = Math.max(
    1,
    ...visiblePlayers.map((p) => chartData[chartData.length - 1]?.[p] ?? 0)
  );
  const yUpper = Math.ceil(maxLineGoals * 1.08);

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

      <div className="scorers-chart__season-bar scoring-trends-year-selector">
        <label htmlFor="scorers-chart-season-scope">View</label>
        <div className="select-wrapper">
          <select
            id="scorers-chart-season-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            {selectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="select-arrow">▼</span>
        </div>
      </div>

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
                  <LineChartTooltip {...props} hiddenPlayers={hiddenPlayers} />
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
