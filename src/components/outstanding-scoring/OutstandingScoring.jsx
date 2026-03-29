import { useMemo, useState, useEffect, useCallback } from "react";
import { config } from "../../leaderboard-config.js";
import { getDisplayName } from "../../utils/playerDisplayName.js";
import {
  collectOutstandingScoringPerformances,
  formatScorelineShort,
  formatGoalRangeLabel,
} from "../../utils/outstanding-scoring.js";
import "./OutstandingScoring.css";

const DEFAULT_SEASONS = ["2024", "2025", "2026"];

export const OutstandingScoring = () => {
  const cfg = config.OUTSTANDING_SCORING;
  const seasons = cfg?.seasons?.length ? cfg.seasons : DEFAULT_SEASONS;
  const collectFloor = typeof cfg?.collectFloor === "number" ? cfg.collectFloor : 3;
  const gMin = typeof cfg?.rangeGoalMin === "number" ? cfg.rangeGoalMin : 3;
  const gMax = typeof cfg?.rangeGoalMax === "number" ? cfg.rangeGoalMax : 9;
  const backfillYear = cfg?.onlyBackfilledBeforeYear;

  const [rangeMin, setRangeMin] = useState(
    () =>
      typeof cfg?.defaultRangeMin === "number"
        ? cfg.defaultRangeMin
        : Math.min(6, gMax)
  );

  /** Single slider = minimum goals; always open-ended upward (e.g. “6+”) */
  const rangeMax = null;

  const span = gMax - gMin;
  const fillPct =
    span > 0 ? Math.min(100, Math.max(0, ((rangeMin - gMin) / span) * 100)) : 100;

  const onGoalsSlider = useCallback((e) => {
    setRangeMin(Number(e.target.value));
  }, []);

  const tickLabels = useMemo(() => {
    const out = [];
    for (let n = gMin; n <= gMax; n++) out.push(n);
    return out;
  }, [gMin, gMax]);

  const { rows, totalPerformances } = useMemo(
    () =>
      collectOutstandingScoringPerformances({
        seasons,
        collectFloor,
        rangeMin,
        rangeMax,
        onlyBackfilledBeforeYear: backfillYear ?? undefined,
      }),
    [seasons, collectFloor, rangeMin, backfillYear]
  );

  const [modalPlayer, setModalPlayer] = useState(null);

  const closeModal = useCallback(() => setModalPlayer(null), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal]);

  if (!cfg?.enabled) return null;

  const rangeDescription = formatGoalRangeLabel(rangeMin, rangeMax);
  const featLabel = cfg?.featLabel || "Big hauls";
  const openTopLabel = `${gMax}+`;

  return (
    <div className="outstanding-scoring">
      <header className="osp-header">
        <div className="osp-hero">
          <div className="osp-hero-glow" aria-hidden />
          <h1 className="osp-title">Outstanding scoring performances</h1>
          <p className="osp-lead">
            Highlight games where a player scored at least your chosen haul — all seasons combined,
            no year picker.
          </p>

          <div className="osp-range-bar" role="group" aria-label="Goals in one match">
            <span className="osp-range-label">Minimum goals (one match)</span>
            <div className="osp-slider">
              <div className="osp-slider-track" aria-hidden>
                <div className="osp-slider-fill" style={{ width: `${fillPct}%` }} />
              </div>
              <input
                type="range"
                className="osp-slider-input"
                min={gMin}
                max={gMax}
                step={1}
                value={rangeMin}
                onChange={onGoalsSlider}
                aria-valuemin={gMin}
                aria-valuemax={gMax}
                aria-valuenow={rangeMin}
                aria-label={`Show games with at least this many goals in one match; right end is ${openTopLabel}`}
              />
              <div className="osp-slider-ticks" aria-hidden>
                {tickLabels.map((n) => {
                  const tickPct = span > 0 ? ((n - gMin) / span) * 100 : 50;
                  return (
                    <span
                      key={n}
                      className={
                        n === gMax ? "osp-slider-tick osp-slider-tick--open" : "osp-slider-tick"
                      }
                      style={{ left: `${tickPct}%` }}
                    >
                      {n === gMax ? openTopLabel : n}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="osp-range-hint">
              Showing <strong>{rangeDescription}</strong>
            </p>
          </div>

          <div className="osp-stats-bar">
            <span className="osp-stat-pill">
              <span className="osp-stat-val">{totalPerformances}</span>
              <span className="osp-stat-lbl">performances</span>
            </span>
            <span className="osp-stat-pill osp-stat-pill--accent">
              <span className="osp-stat-val">{rows.length}</span>
              <span className="osp-stat-lbl">players</span>
            </span>
            <span className="osp-stat-pill osp-stat-pill--muted">
              <span className="osp-stat-lbl">{featLabel}</span>
            </span>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="osp-empty">
          <p>No games match <strong>{rangeDescription}</strong> in the selected seasons yet.</p>
        </div>
      ) : (
        <ul className="osp-grid">
          {rows.map(({ name, count, performances }) => {
            const topHaul = Math.max(...performances.map((p) => p.goals));
            return (
              <li key={name}>
                <button
                  type="button"
                  className="osp-card"
                  onClick={() => setModalPlayer({ name, performances })}
                >
                  <span className="osp-card-badge" aria-hidden>
                    {topHaul}
                  </span>
                  <span className="osp-card-name">{getDisplayName(name)}</span>
                  <span className="osp-card-count">
                    <span className="osp-card-count-num">{count}</span>
                    <span className="osp-card-count-lbl">
                      {count === 1 ? "game" : "games"}
                    </span>
                  </span>
                  <span className="osp-card-hint">View matches →</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {modalPlayer && (
        <div
          className="osp-modal-overlay"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="osp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="osp-modal-title"
          >
            <div className="osp-modal-head">
              <div>
                <h2 id="osp-modal-title" className="osp-modal-title">
                  {getDisplayName(modalPlayer.name)}
                </h2>
                <p className="osp-modal-sub">
                  {modalPlayer.performances.length}{" "}
                  {modalPlayer.performances.length === 1 ? "game" : "games"} · {rangeDescription}
                </p>
              </div>
              <button
                type="button"
                className="osp-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul className="osp-modal-list">
              {modalPlayer.performances.map((p, i) => (
                <li key={`${p.matchId}-${p.season}-${i}`} className="osp-modal-row">
                  <div className="osp-modal-row-top">
                    <span className="osp-modal-goals">{p.goals} goals</span>
                    <span className="osp-modal-season">{p.season}</span>
                  </div>
                  <div className="osp-modal-meta">
                    <span className="osp-modal-date">{p.date}</span>
                    <span className="osp-modal-day">{p.day}</span>
                    <span
                      className={`osp-modal-team osp-team-${String(p.teamColor).toLowerCase()}`}
                    >
                      {p.teamColor}
                    </span>
                  </div>
                  <div className="osp-modal-score">{formatScorelineShort(p.scoreline)}</div>
                  {p.ownGoals > 0 ? (
                    <div className="osp-modal-og">Includes {p.ownGoals} own goal(s)</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
