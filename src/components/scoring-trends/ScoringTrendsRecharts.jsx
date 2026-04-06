import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./ScoringTrendsRecharts.css";

const COLOR_WD = "#60a5fa";
const COLOR_WE = "#fbbf24";
const CANCEL = "#f87171";

function CancelCrossShape(props) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  const s = 7;
  return (
    <g className="trends-recharts-cancel">
      <line
        x1={cx - s}
        y1={cy - s}
        x2={cx + s}
        y2={cy + s}
        stroke={CANCEL}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <line
        x1={cx + s}
        y1={cy - s}
        x2={cx - s}
        y2={cy + s}
        stroke={CANCEL}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
}

function ScorelineInline({ scoreline }) {
  if (!scoreline || typeof scoreline !== "object") return null;
  const entries = Object.entries(scoreline);
  if (entries.length === 0) return null;
  return (
    <div className="trends-rc-tooltip__scoreline">
      {entries.map(([team, score], idx) => (
        <span key={team}>
          <span className={`trends-rc-tooltip__team team-${String(team).toLowerCase()}`}>
            {score}
          </span>
          {idx < entries.length - 1 ? (
            <span className="trends-rc-tooltip__sep">–</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function GoalsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const keys = new Set(payload.map((p) => p.dataKey));
  let showWd =
    keys.has("weekdayGoals") || keys.has("weekdayCancelY");
  let showWe =
    keys.has("weekendGoals") || keys.has("weekendCancelY");
  if (!showWd && !showWe) {
    showWd = !!row.weekdayMeta;
    showWe = !!row.weekendMeta;
  }

  const blocks = [];
  if (showWd && row.weekdayMeta) {
    const m = row.weekdayMeta;
    blocks.push(
      <div key="wd" className="trends-rc-tooltip__block">
        <div className="trends-rc-tooltip__pill trends-rc-tooltip__pill--wd">
          Weekday
        </div>
        <div className="trends-rc-tooltip__date">{m.date}</div>
        {m.isCancelled ? (
          <div className="trends-rc-tooltip__cancelled">Cancelled</div>
        ) : (
          <>
            <ScorelineInline scoreline={m.scoreline} />
            <div className="trends-rc-tooltip__metric">{row.weekdayGoals} goals</div>
          </>
        )}
      </div>
    );
  }
  if (showWe && row.weekendMeta) {
    const m = row.weekendMeta;
    blocks.push(
      <div key="we" className="trends-rc-tooltip__block">
        <div className="trends-rc-tooltip__pill trends-rc-tooltip__pill--we">
          Weekend
        </div>
        <div className="trends-rc-tooltip__date">{m.date}</div>
        {m.isCancelled ? (
          <div className="trends-rc-tooltip__cancelled">Cancelled</div>
        ) : (
          <>
            <ScorelineInline scoreline={m.scoreline} />
            <div className="trends-rc-tooltip__metric">{row.weekendGoals} goals</div>
          </>
        )}
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="trends-rc-tooltip">
      <div className="trends-rc-tooltip__title">{row.matchLabel}</div>
      {blocks}
    </div>
  );
}

function DiffsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const keys = new Set(payload.map((p) => p.dataKey));
  let showWd =
    keys.has("weekdayDiff") || keys.has("weekdayCancelY");
  let showWe =
    keys.has("weekendDiff") || keys.has("weekendCancelY");
  if (!showWd && !showWe) {
    showWd = !!row.weekdayMeta;
    showWe = !!row.weekendMeta;
  }

  const blocks = [];
  if (showWd && row.weekdayMeta) {
    const m = row.weekdayMeta;
    blocks.push(
      <div key="wd" className="trends-rc-tooltip__block">
        <div className="trends-rc-tooltip__pill trends-rc-tooltip__pill--wd">
          Weekday
        </div>
        <div className="trends-rc-tooltip__date">{m.date}</div>
        {m.isCancelled ? (
          <div className="trends-rc-tooltip__cancelled">Cancelled</div>
        ) : (
          <>
            <ScorelineInline scoreline={m.scoreline} />
            <div className="trends-rc-tooltip__metric">
              Margin: {row.weekdayDiff}
            </div>
          </>
        )}
      </div>
    );
  }
  if (showWe && row.weekendMeta) {
    const m = row.weekendMeta;
    blocks.push(
      <div key="we" className="trends-rc-tooltip__block">
        <div className="trends-rc-tooltip__pill trends-rc-tooltip__pill--we">
          Weekend
        </div>
        <div className="trends-rc-tooltip__date">{m.date}</div>
        {m.isCancelled ? (
          <div className="trends-rc-tooltip__cancelled">Cancelled</div>
        ) : (
          <>
            <ScorelineInline scoreline={m.scoreline} />
            <div className="trends-rc-tooltip__metric">
              Margin: {row.weekendDiff}
            </div>
          </>
        )}
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="trends-rc-tooltip">
      <div className="trends-rc-tooltip__title">{row.matchLabel}</div>
      {blocks}
    </div>
  );
}

function playedLineDot(color) {
  return function PlayedDot(props) {
    const { cx, cy, payload, dataKey } = props;
    if (cx == null || cy == null || payload == null) return null;
    const v = payload[dataKey];
    if (v == null || Number.isNaN(v)) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke="var(--bg-card)"
        strokeWidth={2}
        className="trends-recharts-dot"
      />
    );
  };
}

export function GoalsTrendChart({ rows, yMax }) {
  const domainMax = Math.max(5, Math.ceil(yMax * 1.06));

  return (
    <div className="trends-recharts-wrap">
      <div className="trends-recharts__glow" aria-hidden />
      <ResponsiveContainer width="100%" height={420} debounce={50}>
        <ComposedChart
          data={rows}
          margin={{ top: 16, right: 16, left: 4, bottom: 28 }}
        >
          <defs>
            <filter id="trends-goals-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            stroke="var(--trends-rc-grid)"
            strokeDasharray="4 10"
            vertical={false}
          />
          <XAxis
            dataKey="matchLabel"
            tick={{ fill: "var(--trends-rc-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--trends-rc-axis-line)" }}
            interval="preserveStartEnd"
            label={{
              value: "Match #",
              position: "bottom",
              offset: 2,
              fill: "var(--trends-rc-axis-muted)",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <YAxis
            domain={[0, domainMax]}
            allowDecimals={false}
            tick={{ fill: "var(--trends-rc-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--trends-rc-axis-line)" }}
            width={36}
            label={{
              value: "Goals",
              angle: -90,
              position: "insideLeft",
              offset: 4,
              style: {
                fill: "var(--trends-rc-axis-muted)",
                fontSize: 11,
                fontWeight: 600,
              },
            }}
          />
          <Tooltip content={<GoalsTooltip />} cursor={{ strokeDasharray: "4 4" }} />
          <Legend
            wrapperStyle={{ paddingTop: 12 }}
            formatter={(value) => (
              <span className="trends-recharts-legend-label">{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="weekdayGoals"
            name="Weekday"
            stroke={COLOR_WD}
            strokeWidth={2.75}
            connectNulls
            dot={playedLineDot(COLOR_WD)}
            activeDot={{ r: 8, strokeWidth: 2, stroke: "var(--bg-card)" }}
            animationDuration={900}
            style={{ filter: "url(#trends-goals-glow)" }}
          />
          <Line
            type="monotone"
            dataKey="weekendGoals"
            name="Weekend"
            stroke={COLOR_WE}
            strokeWidth={2.75}
            connectNulls
            dot={playedLineDot(COLOR_WE)}
            activeDot={{ r: 8, strokeWidth: 2, stroke: "var(--bg-card)" }}
            animationDuration={900}
            style={{ filter: "url(#trends-goals-glow)" }}
          />
          <Scatter
            dataKey="weekdayCancelY"
            name="Weekday cancelled"
            fill={CANCEL}
            shape={<CancelCrossShape />}
            legendType="none"
          />
          <Scatter
            dataKey="weekendCancelY"
            name="Weekend cancelled"
            fill={CANCEL}
            shape={<CancelCrossShape />}
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DiffsTrendChart({ rows, yMax }) {
  const domainMax = Math.max(5, Math.ceil(yMax * 1.06));

  return (
    <div className="trends-recharts-wrap">
      <div className="trends-recharts__glow" aria-hidden />
      <ResponsiveContainer width="100%" height={420} debounce={50}>
        <ComposedChart
          data={rows}
          margin={{ top: 16, right: 16, left: 4, bottom: 28 }}
        >
          <defs>
            <filter id="trends-diff-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            stroke="var(--trends-rc-grid)"
            strokeDasharray="4 10"
            vertical={false}
          />
          <XAxis
            dataKey="matchLabel"
            tick={{ fill: "var(--trends-rc-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--trends-rc-axis-line)" }}
            interval="preserveStartEnd"
            label={{
              value: "Match #",
              position: "bottom",
              offset: 2,
              fill: "var(--trends-rc-axis-muted)",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <YAxis
            domain={[0, domainMax]}
            allowDecimals={false}
            tick={{ fill: "var(--trends-rc-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--trends-rc-axis-line)" }}
            width={36}
            label={{
              value: "Goal margin",
              angle: -90,
              position: "insideLeft",
              offset: 4,
              style: {
                fill: "var(--trends-rc-axis-muted)",
                fontSize: 11,
                fontWeight: 600,
              },
            }}
          />
          <Tooltip content={<DiffsTooltip />} cursor={{ strokeDasharray: "4 4" }} />
          <Legend
            wrapperStyle={{ paddingTop: 12 }}
            formatter={(value) => (
              <span className="trends-recharts-legend-label">{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="weekdayDiff"
            name="Weekday"
            stroke={COLOR_WD}
            strokeWidth={2.75}
            connectNulls
            dot={playedLineDot(COLOR_WD)}
            activeDot={{ r: 8, strokeWidth: 2, stroke: "var(--bg-card)" }}
            animationDuration={900}
            style={{ filter: "url(#trends-diff-glow)" }}
          />
          <Line
            type="monotone"
            dataKey="weekendDiff"
            name="Weekend"
            stroke={COLOR_WE}
            strokeWidth={2.75}
            connectNulls
            dot={playedLineDot(COLOR_WE)}
            activeDot={{ r: 8, strokeWidth: 2, stroke: "var(--bg-card)" }}
            animationDuration={900}
            style={{ filter: "url(#trends-diff-glow)" }}
          />
          <Scatter
            dataKey="weekdayCancelY"
            name="Weekday cancelled"
            fill={CANCEL}
            shape={<CancelCrossShape />}
            legendType="none"
          />
          <Scatter
            dataKey="weekendCancelY"
            name="Weekend cancelled"
            fill={CANCEL}
            shape={<CancelCrossShape />}
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
