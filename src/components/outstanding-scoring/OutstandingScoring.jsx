import { useMemo, useState, useEffect, useCallback } from "react";
import { config } from "../../leaderboard-config.js";
import { getDisplayName } from "../../utils/playerDisplayName.js";
import {
  collectOutstandingScoringPerformances,
  formatScorelineShort,
} from "../../utils/outstanding-scoring.js";
import "./OutstandingScoring.css";

const DEFAULT_SEASONS = ["2024", "2025", "2026"];

export const OutstandingScoring = () => {
  const cfg = config.OUTSTANDING_SCORING;
  const seasons = cfg?.seasons?.length ? cfg.seasons : DEFAULT_SEASONS;
  const minGoals = typeof cfg?.minGoals === "number" ? cfg.minGoals : 6;
  const backfillYear = cfg?.onlyBackfilledBeforeYear;

  const { rows, totalPerformances } = useMemo(
    () =>
      collectOutstandingScoringPerformances({
        seasons,
        minGoals,
        onlyBackfilledBeforeYear: backfillYear ?? undefined,
      }),
    [seasons, minGoals, backfillYear]
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

  const thresholdLabel = cfg?.thresholdLabel || `${minGoals}+ goals in one match`;
  const featLabel = cfg?.featLabel || "Double hat-trick club";

  return (
    <div className="outstanding-scoring">
      <header className="osp-header">
        <div className="osp-hero">
          <div className="osp-hero-glow" aria-hidden />
          <h1 className="osp-title">Outstanding scoring performances</h1>
          <p className="osp-lead">
            Every time someone bags <strong>{minGoals}+ goals</strong> in a single match
          </p>
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
          <p>No {minGoals}+ goal games recorded in the selected seasons yet.</p>
        </div>
      ) : (
        <ul className="osp-grid">
          {rows.map(({ name, count, performances }) => (
            <li key={name}>
              <button
                type="button"
                className="osp-card"
                onClick={() => setModalPlayer({ name, performances })}
              >
                <span className="osp-card-badge" aria-hidden>
                  {performances[0]?.goals ?? minGoals}+
                </span>
                <span className="osp-card-name">{getDisplayName(name)}</span>
                <span className="osp-card-count">
                  <span className="osp-card-count-num">{count}</span>
                  <span className="osp-card-count-lbl">
                    {count === 1 ? "performance" : "performances"}
                  </span>
                </span>
                <span className="osp-card-hint">View matches →</span>
              </button>
            </li>
          ))}
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
                  {modalPlayer.performances.length === 1 ? "game" : "games"} with {minGoals}+ goals
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
