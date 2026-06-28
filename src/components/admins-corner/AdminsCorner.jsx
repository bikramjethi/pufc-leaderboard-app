import { useEffect, useMemo, useState } from "react";
import { MatchEntry } from "../match-entry";
import { getCurrentSession, signInWithPassword, signOut } from "../../services/supabase/auth";
import {
  deletePlayerProfile,
  fetchPlayerProfiles,
  upsertPlayerProfile,
} from "../../services/supabase/data";
import { setPlayerProfiles } from "../../services/playerProfilesStore";
import { usePlayerProfiles } from "../../hooks/usePlayerProfiles";
import "./AdminsCorner.css";

const AVAILABILITY_OPTIONS = ["ALLGAMES", "MIDWEEK", "WEEKEND", "INACTIVE", "ONLOAN"];

const normalizePositions = (value) =>
  String(value || "")
    .split(",")
    .map((pos) => pos.trim().toUpperCase())
    .filter(Boolean);

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
      ) : (
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

