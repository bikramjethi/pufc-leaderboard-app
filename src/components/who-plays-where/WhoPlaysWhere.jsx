import { useMemo, useState } from "react";
import playerProfiles from "../../data/player-profiles.json";
import { config } from "../../leaderboard-config.js";
import { getDisplayName } from "../../utils/playerDisplayName.js";
import {
  aggregatePositionsForSeason,
  buildEligibleProfileMap,
  mergePositionAggregates,
} from "../../utils/player-position-aggregates.js";
import { getPositionColor } from "../../utils/positionColors.js";
import "./WhoPlaysWhere.css";

const attendanceModules = import.meta.glob("../../data/attendance-data/*.json", {
  eager: true,
});

function loadSeasonData(season) {
  for (const [key, mod] of Object.entries(attendanceModules)) {
    if (key.includes(`/${season}.json`)) return mod.default || mod;
  }
  return null;
}

function buildConicGradient(posCounts) {
  const entries = Object.entries(posCounts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, c]) => s + c, 0);
  if (total <= 0) return "conic-gradient(#334155 0deg 360deg)";
  let acc = 0;
  const parts = entries.map(([pos, c]) => {
    const start = (acc / total) * 360;
    acc += c;
    const end = (acc / total) * 360;
    const color = getPositionColor(pos);
    return `${color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${parts.join(", ")})`;
}

export const WhoPlaysWhere = () => {
  const cfg = config.WHO_PLAYS_WHERE;
  const availableSeasons = useMemo(() => {
    const s = config.WHO_PLAYS_WHERE?.seasons;
    return s?.length ? [...s] : ["2026"];
  }, []);
  const defaultSeason =
    cfg?.defaultSeason && availableSeasons.includes(cfg.defaultSeason)
      ? cfg.defaultSeason
      : availableSeasons[0];
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  const [search, setSearch] = useState("");

  const eligibleByLower = useMemo(
    () => buildEligibleProfileMap(playerProfiles),
    []
  );

  const positionAgg = useMemo(() => {
    if (selectedSeason === "all") {
      const aggs = availableSeasons
        .map((y) => loadSeasonData(y))
        .filter(Boolean)
        .map((data) => aggregatePositionsForSeason(data, eligibleByLower));
      return mergePositionAggregates(aggs);
    }
    const data = loadSeasonData(selectedSeason);
    return data ? aggregatePositionsForSeason(data, eligibleByLower) : new Map();
  }, [selectedSeason, availableSeasons, eligibleByLower]);

  const playerRows = useMemo(() => {
    const rows = [];
    for (const [name, posMap] of positionAgg) {
      const obj = Object.fromEntries(posMap);
      const total = Object.values(obj).reduce((a, b) => a + b, 0);
      if (total < 1) continue;
      const unique = Object.keys(obj).length;
      rows.push({ name, posCounts: obj, total, unique });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const display = getDisplayName(r.name).toLowerCase();
      return r.name.toLowerCase().includes(q) || display.includes(q);
    });
  }, [positionAgg, search]);

  if (!cfg?.enabled) return null;

  return (
    <div className="who-plays-where">
      <header className="wpw-header">
        <div className="wpw-title-block">
          <h2 className="wpw-title">Who plays where ?</h2>
          <p className="wpw-subtitle">
            Match appearances by position — see who rotates across the pitch
          </p>
        </div>
        <div className="wpw-toolbar">
          <label className="wpw-search-wrap">
            <span className="wpw-visually-hidden">Search player</span>
            <span className="wpw-search-icon" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              className="wpw-search"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="wpw-season">
            <span className="wpw-season-label">Season</span>
            <select
              className="wpw-season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              {availableSeasons.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </header>

      {playerRows.length === 0 ? (
        <div className="wpw-empty">
          {search.trim()
            ? "No players match your search for this season."
            : "No position data for this season yet."}
        </div>
      ) : (
        <ul className="wpw-grid">
          {playerRows.map(({ name, posCounts, total, unique }) => (
            <li key={name} className="wpw-card">
              <div className="wpw-card-top">
                <div
                  className="wpw-donut"
                  style={{ background: buildConicGradient(posCounts) }}
                  title={`${total} appearances`}
                >
                  <div className="wpw-donut-hole">
                    <span className="wpw-donut-total">{total}</span>
                    <span className="wpw-donut-label">apps</span>
                  </div>
                </div>
                <div className="wpw-card-heading">
                  <h3 className="wpw-player-name">{getDisplayName(name)}</h3>
                  <p className="wpw-meta">
                    <span className="wpw-meta-pill">{unique} positions</span>
                    <span className="wpw-meta-pill wpw-meta-accent">
                      {unique >= 4 ? "Utility +" : unique >= 2 ? "Flexible" : "Specialist"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="wpw-bars">
                {Object.entries(posCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([pos, count]) => {
                    const pct = Math.round((count / total) * 1000) / 10;
                    return (
                      <div key={pos} className="wpw-bar-row">
                        <span
                          className="wpw-pos-tag"
                          style={{
                            borderColor: getPositionColor(pos),
                            color: getPositionColor(pos),
                          }}
                        >
                          {pos}
                        </span>
                        <div className="wpw-bar-track">
                          <div
                            className="wpw-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: getPositionColor(pos),
                            }}
                          />
                        </div>
                        <span className="wpw-bar-count">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
