import { useEffect, useMemo, useState } from "react";
import { MatchEntry } from "../match-entry";
import { getCurrentSession, signInWithPassword, signOut } from "../../services/supabase/auth";
import {
  deletePlayerProfile,
  fetchAppConfig,
  fetchPlayerProfiles,
  upsertAppConfig,
  upsertPlayerProfile,
} from "../../services/supabase/data";
import { config } from "../../leaderboard-config";
import { setPlayerProfiles } from "../../services/playerProfilesStore";
import { usePlayerProfiles } from "../../hooks/usePlayerProfiles";
import "./AdminsCorner.css";

const AVAILABILITY_OPTIONS = ["ALLGAMES", "MIDWEEK", "WEEKEND", "INACTIVE", "ONLOAN"];

const normalizePositions = (value) =>
  String(value || "")
    .split(",")
    .map((pos) => pos.trim().toUpperCase())
    .filter(Boolean);

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const mergeDeep = (target, source) => {
  if (!isPlainObject(source)) return target;
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      target[key] = [...value];
      return;
    }
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      mergeDeep(target[key], value);
      return;
    }
    target[key] = value;
  });
  return target;
};

const FIELD_META = {
  "SUPABASE.enabled": { label: "Use Supabase", description: "Master switch for Supabase integration." },
  "SUPABASE.writeEnabled": { label: "Allow writes", description: "Allow save/update flows to write to Supabase." },
  "SUPABASE.requireAuthForMatchEntry": {
    label: "Require auth for match entry",
    description: "Only signed-in editors/admins can submit match data.",
  },
  "SUPABASE.readModules.weeklyTracker": { label: "Weekly Tracker reads" },
  "SUPABASE.readModules.attendanceLeaderboard": { label: "Attendance reads" },
  "SUPABASE.readModules.statsLeaderboard": { label: "Stats leaderboard reads" },
  ENABLE_COMPARISON: { label: "Enable comparison cards" },
  ENABLE_SEARCH: { label: "Enable search boxes" },
  ENABLE_MAX_HIGHLIGHT: { label: "Enable top-stat highlights" },
  ENABLE_PLAYER_MODAL: { label: "Enable player modal" },
  ENABLE_TICKER: { label: "Enable news ticker" },
  "STATS_LEADERBOARD.defaultSeason": { label: "Default stats season" },
  "ATTENDANCE.LEADERBOARD.defaultSeason": { label: "Default attendance season" },
  "ATTENDANCE.TRACKER.defaultSeason": { label: "Default tracker season" },
};

const SECTION_META = {
  SUPABASE: {
    label: "Supabase Settings",
    description: "Connection behavior, auth requirements and read/write capabilities.",
  },
  "SUPABASE.readModules": {
    label: "Supabase Read Modules",
    description: "Choose which modules fetch their read data from Supabase.",
  },
  STATS_LEADERBOARD: {
    label: "Stats Leaderboard",
    description: "Main stats table behavior, season defaults and column visibility.",
  },
  ATTENDANCE: {
    label: "Attendance",
    description: "Attendance leaderboard and weekly tracker controls.",
  },
  INSIGHTS: { label: "Insights" },
  SCORING_TRENDS: { label: "Scoring Trends" },
  SCORERS_CHART: { label: "Scorers Chart" },
  FUN_STATS: { label: "Fun Stats" },
  MATCH_ENTRY: { label: "Match Entry" },
  CREATE_LINEUP: { label: "Create Lineup" },
};

const ENUM_OPTIONS = {
  "DEFAULT_SORT_KEY": ["matches", "wins", "draws", "losses", "goals", "cleanSheets", "hatTricks", "name"],
  "DEFAULT_SORT_DIR": ["asc", "desc"],
  "STATS_LEADERBOARD.defaultSeason": ["2024", "2025", "2026", "all-time"],
  "ATTENDANCE.LEADERBOARD.defaultSeason": ["2025", "2026"],
  "ATTENDANCE.TRACKER.defaultSeason": ["2026"],
  "INSIGHTS.defaultSeason": ["2024", "2025", "2026"],
  "SCORING_TRENDS.defaultSeason": ["2024", "2025", "2026"],
  "FUN_STATS.defaultSeason": ["all", "2024", "2025", "2026"],
  "MVP_LEADERBOARD.defaultSeason": ["all", "2024", "2025", "2026"],
  "WEEKLY_TEAMS.defaultSeason": ["2024", "2025", "2026"],
  "WHO_PLAYS_WHERE.defaultSeason": ["2026"],
};

const formatKeyLabel = (key) =>
  String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const getFieldMeta = (path, key) => {
  const fullPath = [...path, key].join(".");
  return FIELD_META[fullPath] || { label: formatKeyLabel(key), description: "" };
};

export const AdminsCorner = () => {
  const profiles = usePlayerProfiles();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("match-entry");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState("");
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    groupAvailibility: "ALLGAMES",
    positionsText: "MID",
    isTracked: true,
  });

  useEffect(() => {
    getCurrentSession()
      .then((s) => setSession(s))
      .catch(() => setSession(null));
  }, []);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const data = await signInWithPassword({ email: authEmail.trim(), password: authPassword });
      setSession(data.session || null);
      setAuthPassword("");
    } catch (e) {
      setAuthError(e?.message || "Failed to sign in");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSession(null);
      setAuthError("");
    } catch (e) {
      setAuthError(e?.message || "Failed to sign out");
    }
  };

  const playerRows = useMemo(
    () =>
      (profiles || []).map((p) => ({
        name: p.name,
        groupAvailibility: p.groupAvailibility || "ALLGAMES",
        positionsText: Array.isArray(p.position) ? p.position.join(", ") : "MID",
        isTracked: p.isTracked !== false,
      })),
    [profiles]
  );

  const refreshPlayers = async () => {
    setPlayersLoading(true);
    setPlayersError("");
    try {
      const rows = await fetchPlayerProfiles();
      setPlayerProfiles(rows);
    } catch (e) {
      setPlayersError(e?.message || "Failed to load players.");
    } finally {
      setPlayersLoading(false);
    }
  };

  useEffect(() => {
    if (!session || activeTab !== "add-player") return;
    refreshPlayers();
  }, [session, activeTab]);

  const saveExistingPlayer = async (row) => {
    setPlayersError("");
    try {
      await upsertPlayerProfile({
        name: row.name,
        groupAvailibility: row.groupAvailibility,
        position: normalizePositions(row.positionsText),
        isTracked: row.isTracked,
      });
      await refreshPlayers();
    } catch (e) {
      setPlayersError(e?.message || "Failed to save player.");
    }
  };

  const deleteExistingPlayer = async (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    setPlayersError("");
    try {
      await deletePlayerProfile(name);
      await refreshPlayers();
    } catch (e) {
      setPlayersError(e?.message || "Failed to delete player.");
    }
  };

  const addPlayer = async () => {
    if (!newPlayer.name.trim()) {
      setPlayersError("Player name is required.");
      return;
    }
    setPlayersError("");
    try {
      await upsertPlayerProfile({
        name: newPlayer.name,
        groupAvailibility: newPlayer.groupAvailibility,
        position: normalizePositions(newPlayer.positionsText),
        isTracked: newPlayer.isTracked,
      });
      setNewPlayer({
        name: "",
        groupAvailibility: "ALLGAMES",
        positionsText: "MID",
        isTracked: true,
      });
      await refreshPlayers();
    } catch (e) {
      setPlayersError(e?.message || "Failed to add player.");
    }
  };

  if (!session) {
    const canSubmit = !authLoading && authEmail.trim() && authPassword;

    return (
      <div className="attendance admins-corner">
        <div className="attendance-no-data admin-auth-shell">
          <div className="admin-auth-card">
            <h3>Admins Corner</h3>
            <p>Sign in to access admin tools.</p>
          {authError ? <div className="error-message">{authError}</div> : null}
            <div className="admin-auth-form">
              <div className="form-group admin-auth-field">
                <label htmlFor="admin-auth-email">Email</label>
                <input
                  id="admin-auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="form-group admin-auth-field">
                <label htmlFor="admin-auth-password">Password</label>
                <input
                  id="admin-auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) {
                      handleSignIn();
                    }
                  }}
                />
              </div>
              <button className="btn btn-primary admin-auth-submit" onClick={handleSignIn} disabled={!canSubmit}>
                {authLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </div>
          <div className="admin-auth-help">
            Use your Supabase admin account credentials.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance">
      <div className="sub-tab-nav">
        <div className="stats-view-tabs">
          <button
            className={`stats-view-tab ${activeTab === "match-entry" ? "active" : ""}`}
            onClick={() => setActiveTab("match-entry")}
          >
            📝 Match Entry
          </button>
          <button
            className={`stats-view-tab ${activeTab === "add-player" ? "active" : ""}`}
            onClick={() => setActiveTab("add-player")}
          >
            ➕ Add Player
          </button>
          <button
            className={`stats-view-tab ${activeTab === "app-config" ? "active" : ""}`}
            onClick={() => setActiveTab("app-config")}
          >
            ⚙️ Config
          </button>
        </div>
        <div className="attendance-year-selector">
          <label>{session.user?.email}</label>
          <button className="btn btn-secondary" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {authError ? <div className="error-message">{authError}</div> : null}
      {activeTab === "match-entry" ? (
        <MatchEntry />
      ) : activeTab === "add-player" ? (
        <div className="player-admin-panel">
          <h3>Player Profiles</h3>
          <p className="player-admin-help">
            Manage names, positions, availability and tracked flag. Changes are saved to Supabase.
          </p>
          {playersError ? <div className="error-message">{playersError}</div> : null}

          <div className="player-admin-add-row">
            <input
              type="text"
              placeholder="Player name"
              value={newPlayer.name}
              onChange={(e) => setNewPlayer((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              value={newPlayer.groupAvailibility}
              onChange={(e) =>
                setNewPlayer((prev) => ({ ...prev, groupAvailibility: e.target.value }))
              }
            >
              {AVAILABILITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Positions (comma-separated)"
              value={newPlayer.positionsText}
              onChange={(e) =>
                setNewPlayer((prev) => ({ ...prev, positionsText: e.target.value }))
              }
            />
            <label className="player-admin-tracked">
              <input
                type="checkbox"
                checked={newPlayer.isTracked}
                onChange={(e) => setNewPlayer((prev) => ({ ...prev, isTracked: e.target.checked }))}
              />
              Tracked
            </label>
            <button className="btn btn-primary" onClick={addPlayer}>
              Add
            </button>
          </div>

          <div className="player-admin-table-wrap">
            <table className="player-admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Availability</th>
                  <th>Positions</th>
                  <th>Tracked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {playerRows.map((row) => (
                  <PlayerAdminRow
                    key={row.name}
                    row={row}
                    onSave={saveExistingPlayer}
                    onDelete={deleteExistingPlayer}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {playersLoading ? <p className="player-admin-help">Refreshing players...</p> : null}
        </div>
      ) : (
        <ConfigAdminPanel />
      )}
    </div>
  );
};

const PlayerAdminRow = ({ row, onSave, onDelete }) => {
  const [draft, setDraft] = useState(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  return (
    <tr>
      <td>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
        />
      </td>
      <td>
        <select
          value={draft.groupAvailibility}
          onChange={(e) => setDraft((prev) => ({ ...prev, groupAvailibility: e.target.value }))}
        >
          {AVAILABILITY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="text"
          value={draft.positionsText}
          onChange={(e) => setDraft((prev) => ({ ...prev, positionsText: e.target.value }))}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={draft.isTracked}
          onChange={(e) => setDraft((prev) => ({ ...prev, isTracked: e.target.checked }))}
        />
      </td>
      <td className="player-admin-actions">
        <button className="btn btn-primary" onClick={() => onSave(draft)}>
          Save
        </button>
        <button className="btn btn-secondary" onClick={() => onDelete(row.name)}>
          Delete
        </button>
      </td>
    </tr>
  );
};

const ConfigAdminPanel = () => {
  const [draftConfig, setDraftConfig] = useState(() => cloneJson(config));
  const [configLoading, setConfigLoading] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  useEffect(() => {
    setConfigLoading(true);
    setConfigMessage("");
    fetchAppConfig("leaderboard")
      .then((value) => {
        const base = cloneJson(config);
        setDraftConfig(mergeDeep(base, value || {}));
      })
      .catch((e) => setConfigMessage(e?.message || "Failed to load remote config."))
      .finally(() => setConfigLoading(false));
  }, []);

  const handleSave = async () => {
    setConfigMessage("");
    setConfigLoading(true);
    try {
      await upsertAppConfig({ key: "leaderboard", value: draftConfig });
      setConfigMessage("Saved. Reload app to apply changes.");
    } catch (e) {
      setConfigMessage(e?.message || "Failed to save config.");
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <div className="player-admin-panel">
      <h3>Leaderboard Config (Remote Override)</h3>
      <p className="player-admin-help">
        Toggle settings by section. This saves a full remote config document.
      </p>
      {configMessage ? <div className="info-message">{configMessage}</div> : null}
      <div className="config-sections">
        <ConfigFieldsEditor value={draftConfig} onChange={setDraftConfig} path={[]} />
      </div>
      <div className="player-admin-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={configLoading}>
          {configLoading ? "Saving..." : "Save Config"}
        </button>
      </div>
    </div>
  );
};

const setValueAtPath = (obj, path, nextValue) => {
  const out = cloneJson(obj);
  let ref = out;
  for (let i = 0; i < path.length - 1; i += 1) {
    ref = ref[path[i]];
  }
  ref[path[path.length - 1]] = nextValue;
  return out;
};

const ConfigFieldsEditor = ({ value, onChange, path }) => {
  if (!isPlainObject(value)) return null;
  return (
    <>
      {Object.entries(value).map(([key, current]) => {
        const currentPath = [...path, key];
        const id = currentPath.join(".");
        const sectionMeta = SECTION_META[id];
        const fieldMeta = getFieldMeta(path, key);
        if (isPlainObject(current)) {
          return (
            <div key={id} className="config-section-card">
              <h4>{sectionMeta?.label || formatKeyLabel(key)}</h4>
              <p className="config-key-hint">Key: <code>{id}</code></p>
              {sectionMeta?.description ? (
                <p className="config-desc">{sectionMeta.description}</p>
              ) : null}
              <ConfigFieldsEditor
                value={current}
                onChange={onChange}
                path={currentPath}
              />
            </div>
          );
        }
        if (typeof current === "boolean") {
          return (
            <label key={id} className="config-field-row">
              <span>
                <strong>{fieldMeta.label}</strong>
                <small className="config-key-hint-inline">{id}</small>
                {fieldMeta.description ? <small className="config-desc-inline">{fieldMeta.description}</small> : null}
              </span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={current}
                  onChange={(e) =>
                    onChange((prev) => setValueAtPath(prev, currentPath, e.target.checked))
                  }
                />
                <span className="slider" />
              </span>
            </label>
          );
        }
        if (typeof current === "number") {
          return (
            <label key={id} className="config-field-row">
              <span>
                <strong>{fieldMeta.label}</strong>
                <small className="config-key-hint-inline">{id}</small>
              </span>
              <input
                type="number"
                value={current}
                onChange={(e) =>
                  onChange((prev) => setValueAtPath(prev, currentPath, Number(e.target.value)))
                }
              />
            </label>
          );
        }
        const enumOptions = ENUM_OPTIONS[id];
        if (Array.isArray(enumOptions)) {
          return (
            <label key={id} className="config-field-row">
              <span>
                <strong>{fieldMeta.label}</strong>
                <small className="config-key-hint-inline">{id}</small>
              </span>
              <select
                value={String(current ?? "")}
                onChange={(e) =>
                  onChange((prev) => setValueAtPath(prev, currentPath, e.target.value))
                }
              >
                {enumOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        if (Array.isArray(current)) {
          return (
            <label key={id} className="config-field-row">
              <span>
                <strong>{fieldMeta.label}</strong>
                <small className="config-key-hint-inline">{id}</small>
              </span>
              <input
                type="text"
                value={current.join(", ")}
                onChange={(e) =>
                  onChange((prev) =>
                    setValueAtPath(
                      prev,
                      currentPath,
                      e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean)
                    )
                  )
                }
              />
            </label>
          );
        }
        return (
          <label key={id} className="config-field-row">
            <span>
              <strong>{fieldMeta.label}</strong>
              <small className="config-key-hint-inline">{id}</small>
            </span>
            <input
              type="text"
              value={String(current ?? "")}
              onChange={(e) =>
                onChange((prev) => setValueAtPath(prev, currentPath, e.target.value))
              }
            />
          </label>
        );
      })}
    </>
  );
};

