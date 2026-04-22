import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { config } from "../../leaderboard-config.js";
import { getDisplayName } from "../../utils/playerDisplayName.js";
import { buildCumulativeOgLeadersData } from "../../utils/og-leaders-data.js";
import "../scorers-chart/ScorersChart.css";
import "./OGLeaders.css";

const PLAYER_STROKES = [
  "#fb7185",
  "#f472b6",
  "#c084fc",
  "#f97316",
  "#fbbf24",
  "#22d3ee",
  "#60a5fa",
  "#4ade80",
  "#2dd4bf",
  "#a3e635",
];

function OgBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const name = row?.payload?.playerKey;
  if (name == null) return null;
  return (
    <div className="scorers-chart-tooltip scorers-chart-tooltip--bar">
      <div className="scorers-chart-tooltip__title">{getDisplayName(name)}</div>
      <p className="scorers-chart-bar-tooltip__stat">
        <span className="scorers-chart-bar-tooltip__value">{row.value}</span>
        <span className="scorers-chart-bar-tooltip__suffix">
          {" "}
          cumulative own goal{row.value === 1 ? "" : "s"} · all seasons
        </span>
      </p>
      <p className="ogl-tooltip-hint">Click the bar or name below for match list</p>
    </div>
  );
}

export function OGLeaders() {
  const chartCfg = config.OG_LEADERS || {};
  const topN = typeof chartCfg.topN === "number" ? chartCfg.topN : 15;

  const built = useMemo(() => buildCumulativeOgLeadersData({ topN }), [topN]);

  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const closeModal = useCallback(() => setSelectedPlayer(null), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal]);

  const onBarClick = useCallback((entry) => {
    const key = entry?.payload?.playerKey ?? entry?.playerKey;
    if (key) setSelectedPlayer(key);
  }, []);

  const selectedRow = selectedPlayer ? built.byPlayer.get(selectedPlayer) : null;

  if (!built.barData.length) {
    return (
      <div className="scorers-chart og-leaders scorers-chart--empty">
        <p>No own goals found in attendance data.</p>
        <p className="ogl-empty-note">
          Counts every played, non-cancelled, non-tournament match in{" "}
          <code>attendance-data/20*.json</code> where a player row has{" "}
          <code>ownGoals</code> &gt; 0.
        </p>
      </div>
    );
  }

  const yMax = Math.max(1, Math.ceil(built.maxOgs * 1.12));
  const seasonLabel = built.seasonKeys.join(", ");

  return (
    <div className="scorers-chart og-leaders">
      <header className="scorers-chart__header">
        <div className="scorers-chart__headline">
          <h2 className="scorers-chart__title scorers-chart__title--bar ogl-title">
            OG leaders
          </h2>
          <p className="scorers-chart__subtitle">
            Cumulative own goals across every season in attendance data · Top{" "}
            {built.topPlayers.length} in this view (low → high left to right)
          </p>
        </div>
        <div className="scorers-chart__badge" aria-hidden>
          <span className="scorers-chart__badge-glow" />
          <span className="scorers-chart__badge-inner">All seasons</span>
        </div>
      </header>

      <p className="ogl-meta">
        <strong>{built.matchCount}</strong> matches scanned · Seasons{" "}
        <strong>{seasonLabel}</strong>
      </p>

      <div className="scorers-chart__canvas-wrap scorers-chart__canvas-wrap--bar">
        <div className="scorers-chart__grid-bg" aria-hidden />
        <ResponsiveContainer width="100%" height={480} debounce={50}>
          <BarChart
            data={built.barData}
            margin={{ top: 28, right: 12, left: 4, bottom: 88 }}
          >
            <defs>
              <filter
                id="ogl-bar-glow"
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
              {built.barData.map((_, i) => (
                <linearGradient
                  key={`ogl-g-${i}`}
                  id={`ogl-bar-grad-${i}`}
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
              width={44}
              label={{
                value: "Own goals",
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
              content={<OgBarTooltip />}
              cursor={{
                fill: "var(--scorers-chart-bar-cursor)",
                radius: 8,
              }}
            />
            <Bar
              dataKey="ogs"
              name="Own goals"
              radius={[10, 10, 4, 4]}
              maxBarSize={56}
              animationDuration={900}
              animationEasing="ease-out"
              className="ogl-bar-hit"
              onClick={onBarClick}
            >
              {built.barData.map((_, i) => (
                <Cell
                  key={`ogl-c-${i}`}
                  fill={`url(#ogl-bar-grad-${i})`}
                  stroke={PLAYER_STROKES[i % PLAYER_STROKES.length]}
                  strokeWidth={1}
                  strokeOpacity={0.85}
                  style={{ filter: "url(#ogl-bar-glow)", cursor: "pointer" }}
                />
              ))}
              <LabelList
                dataKey="ogs"
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

      <div className="ogl-name-panel">
        <p className="ogl-name-panel__label">Open breakdown by player</p>
        <ul className="ogl-name-panel__list" role="list">
          {[...built.topPlayers].reverse().map((name) => {
            const ogs = built.byPlayer.get(name)?.totalOgs ?? 0;
            return (
              <li key={name}>
                <button
                  type="button"
                  className={`ogl-name-btn${selectedPlayer === name ? " is-active" : ""}`}
                  onClick={() => setSelectedPlayer(name)}
                >
                  <span>{getDisplayName(name)}</span>
                  <span className="ogl-name-btn__count">{ogs}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="scorers-chart__footer">
        <span className="scorers-chart__foot-note">
          Totals sum <code>ownGoals</code> on each player row in{" "}
          <code>src/data/attendance-data/20*.json</code>. New season files are picked up
          automatically. Click a player to see every match that contributed to their
          count.
        </span>
      </footer>

      {selectedPlayer && selectedRow && (
        <div
          className="ogl-modal-overlay"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="ogl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ogl-modal-title"
          >
            <div className="ogl-modal-head">
              <div>
                <h2 id="ogl-modal-title" className="ogl-modal-title">
                  {getDisplayName(selectedPlayer)}
                </h2>
                <p className="ogl-modal-sub">
                  {selectedRow.totalOgs} own goal{selectedRow.totalOgs === 1 ? "" : "s"}{" "}
                  · {selectedRow.games.length} match
                  {selectedRow.games.length === 1 ? "" : "es"}
                </p>
              </div>
              <button
                type="button"
                className="ogl-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul className="ogl-modal-list">
              {selectedRow.games.map((g, i) => (
                <li key={`${g.matchId}-${g.season}-${i}`} className="ogl-modal-row">
                  <div className="ogl-modal-row-top">
                    <span className="ogl-modal-ogs">
                      {g.ownGoals} OG{g.ownGoals === 1 ? "" : "s"}
                    </span>
                    <span className="ogl-modal-season">{g.season}</span>
                  </div>
                  <div className="ogl-modal-meta">
                    <span className="ogl-modal-date">{g.date}</span>
                    <span className="ogl-modal-day">{g.day}</span>
                    <span
                      className={`ogl-modal-team ogl-team-${String(g.teamColor).toLowerCase()}`}
                    >
                      {g.teamColor}
                    </span>
                  </div>
                  <div className="ogl-modal-score">{g.scorelineLabel}</div>
                  <div className="ogl-modal-id">Match id: {g.matchId}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
