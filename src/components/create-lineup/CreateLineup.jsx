import { useCallback, useEffect, useMemo, useState } from "react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import "./CreateLineup.css";
import { usePlayerProfiles } from "../../hooks/usePlayerProfiles";

// Position coordinates on a football field (percentage-based)
// Field is divided into two halves - team1 on left, team2 on right
const POSITION_COORDS = {
  // Left half (Team 1) - playing left to right
  team1: {
    GK: { x: 8, y: 50 },
    LB: { x: 22, y: 20 },
    CB: { x: 22, y: 50 },
    RB: { x: 22, y: 80 },
    LM: { x: 36, y: 20 },
    CM: { x: 36, y: 50 },
    RM: { x: 36, y: 80 },
    ST: { x: 46, y: 50 },
  },
  // Right half (Team 2) - playing right to left (mirrored)
  team2: {
    GK: { x: 92, y: 50 },
    RB: { x: 78, y: 20 },
    CB: { x: 78, y: 50 },
    LB: { x: 78, y: 80 },
    RM: { x: 64, y: 20 },
    CM: { x: 64, y: 50 },
    LM: { x: 64, y: 80 },
    ST: { x: 54, y: 50 },
  },
};

// Available team colors
const TEAM_COLORS = ["RED", "BLUE", "BLACK", "WHITE", "YELLOW"];

// Position codes for 8v8 formation
const POSITIONS = ["GK", "LB", "CB", "RB", "LM", "CM", "RM", "ST"];
const MATCH_MODES = {
  "8v8": ["GK", "LB", "CB", "RB", "LM", "CM", "RM", "ST"],
  "9v9": ["GK", "LB", "CB", "RB", "LM", "CM", "RM", "ST", "ST"],
};
const DEFAULT_MATCH_MODE = "8v8";

const URL_STATE_KEY = "lineup";
const COMPACT_SCHEMA_VERSION = 2;

const safeEncode = (obj) => {
  try {
    const json = JSON.stringify(obj);
    return compressToEncodedURIComponent(json);
  } catch {
    return "";
  }
};

const safeDecode = (encoded) => {
  try {
    const json = decompressFromEncodedURIComponent(String(encoded || ""));
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const buildTeamPlayersForMode = (mode) =>
  (MATCH_MODES[mode] || MATCH_MODES[DEFAULT_MATCH_MODE]).map((position, idx) => ({
    slotId: `${position}-${idx}`,
    position,
    name: "",
  }));

const normalizeTeamPlayers = (teamPlayers, mode = DEFAULT_MATCH_MODE) => {
  const template = buildTeamPlayersForMode(mode);
  const byPos = new Map();
  (Array.isArray(teamPlayers) ? teamPlayers : [])
    .filter((p) => p?.position && POSITIONS.includes(String(p.position)))
    .forEach((p) => {
      const pos = String(p.position);
      const list = byPos.get(pos) || [];
      list.push(String(p.name || ""));
      byPos.set(pos, list);
    });

  return template.map((slot) => {
    const names = byPos.get(slot.position) || [];
    const name = names.length ? names.shift() : "";
    return { ...slot, name };
  });
};

const isValidTeamColor = (color) => TEAM_COLORS.includes(String(color || "").toUpperCase());

const compactPayload = ({ matchMode, team1Color, team2Color, team1Players, team2Players }) => [
  COMPACT_SCHEMA_VERSION,
  String(matchMode || DEFAULT_MATCH_MODE),
  String(team1Color || "RED").toUpperCase(),
  String(team2Color || "BLUE").toUpperCase(),
  (team1Players || []).map((p) => String(p?.name || "")),
  (team2Players || []).map((p) => String(p?.name || "")),
];

const expandDecodedPayload = (decoded) => {
  if (Array.isArray(decoded) && decoded[0] === COMPACT_SCHEMA_VERSION) {
    const mode = decoded[1] === "9v9" ? "9v9" : "8v8";
    const t1 = Array.isArray(decoded[4]) ? decoded[4] : [];
    const t2 = Array.isArray(decoded[5]) ? decoded[5] : [];
    const template = buildTeamPlayersForMode(mode);
    return {
      matchMode: mode,
      team1Color: decoded[2],
      team2Color: decoded[3],
      team1Players: template.map((slot, i) => ({ ...slot, name: String(t1[i] || "") })),
      team2Players: template.map((slot, i) => ({ ...slot, name: String(t2[i] || "") })),
    };
  }

  return null;
};

// Get team color class
const getTeamColorClass = (teamColor) => {
  const color = teamColor?.toUpperCase();
  switch (color) {
    case "RED": return "team-red";
    case "BLUE": return "team-blue";
    case "BLACK": return "team-black";
    case "WHITE": return "team-white";
    case "YELLOW": return "team-yellow";
    default: return "team-default";
  }
};

export const CreateLineup = () => {
  const playerProfiles = usePlayerProfiles();
  const [matchMode, setMatchMode] = useState(DEFAULT_MATCH_MODE);
  const [team1Color, setTeam1Color] = useState("RED");
  const [team2Color, setTeam2Color] = useState("BLUE");
  const [shareStatus, setShareStatus] = useState("");
  
  // Team 1 players: { position: "GK", name: "" }
  const [team1Players, setTeam1Players] = useState(() => 
    buildTeamPlayersForMode(DEFAULT_MATCH_MODE)
  );
  
  // Team 2 players: { position: "GK", name: "" }
  const [team2Players, setTeam2Players] = useState(() => 
    buildTeamPlayersForMode(DEFAULT_MATCH_MODE)
  );

  const lineupPayload = useMemo(() => compactPayload({
    matchMode,
    team1Color,
    team2Color,
    team1Players,
    team2Players,
  }), [matchMode, team1Color, team2Color, team1Players, team2Players]);

  const buildShareUrl = useCallback(() => {
    const encoded = safeEncode(lineupPayload);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "create-lineup");
    if (encoded) {
      url.searchParams.set(URL_STATE_KEY, encoded);
    }
    return url.toString();
  }, [lineupPayload]);

  // Get all known player names
  const allKnownPlayers = useMemo(() => {
    return playerProfiles.map(p => p.name).sort();
  }, []);

  // Update player name for a team
  const updatePlayerName = (teamNum, slotId, name) => {
    if (teamNum === 1) {
      setTeam1Players(prev => 
        prev.map(p => p.slotId === slotId ? { ...p, name } : p)
      );
    } else {
      setTeam2Players(prev => 
        prev.map(p => p.slotId === slotId ? { ...p, name } : p)
      );
    }
  };

  // Clear all players
  const handleClear = () => {
    setMatchMode(DEFAULT_MATCH_MODE);
    setTeam1Players(buildTeamPlayersForMode(DEFAULT_MATCH_MODE));
    setTeam2Players(buildTeamPlayersForMode(DEFAULT_MATCH_MODE));
    setShareStatus("");
  };

  const copyShareUrl = useCallback(async () => {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Share URL copied.");
    } catch {
      setShareStatus("Couldn't auto-copy. Copy from browser address bar after opening share URL.");
      window.prompt("Copy this share URL", url);
    }
  }, [buildShareUrl]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(URL_STATE_KEY);
    if (!encoded) return;

    const decoded = safeDecode(encoded);
    const expanded = expandDecodedPayload(decoded);
    if (!expanded || typeof expanded !== "object") {
      setShareStatus("Invalid share URL.");
      return;
    }

    const nextTeam1Color = isValidTeamColor(expanded.team1Color) ? String(expanded.team1Color).toUpperCase() : "RED";
    const nextTeam2Color = isValidTeamColor(expanded.team2Color) ? String(expanded.team2Color).toUpperCase() : "BLUE";
    const nextMode = expanded.matchMode === "9v9" ? "9v9" : "8v8";

    setMatchMode(nextMode);
    setTeam1Color(nextTeam1Color);
    setTeam2Color(nextTeam2Color);
    setTeam1Players(normalizeTeamPlayers(expanded.team1Players, nextMode));
    setTeam2Players(normalizeTeamPlayers(expanded.team2Players, nextMode));
    setShareStatus("Lineup loaded from share URL.");
  }, []);

  return (
    <div className="create-lineup">
      <div className="lineup-container">
        {/* Controls Section */}
        <div className="lineup-controls">
          <div className="controls-header">
            <h2>Create Lineup</h2>
            <p>Set up your football lineup ({matchMode})</p>
          </div>

          <div className="team-color-selectors">
            <div className="team-color-group">
              <label>Match Mode</label>
              <select
                value={matchMode}
                onChange={(e) => {
                  const nextMode = e.target.value === "9v9" ? "9v9" : "8v8";
                  setMatchMode(nextMode);
                  setTeam1Players(buildTeamPlayersForMode(nextMode));
                  setTeam2Players(buildTeamPlayersForMode(nextMode));
                  setShareStatus("");
                }}
                className="color-select"
              >
                <option value="8v8">8v8</option>
                <option value="9v9">9v9 (2 ST)</option>
              </select>
            </div>
          </div>

          {/* Team Color Selectors */}
          <div className="team-color-selectors">
            <div className="team-color-group">
              <label>Team 1 Color</label>
              <select 
                value={team1Color} 
                onChange={(e) => setTeam1Color(e.target.value)}
                className="color-select"
              >
                {TEAM_COLORS.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
            <div className="team-color-group">
              <label>Team 2 Color</label>
              <select 
                value={team2Color} 
                onChange={(e) => setTeam2Color(e.target.value)}
                className="color-select"
              >
                {TEAM_COLORS.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Player Inputs */}
          <div className="player-inputs-section">
            <div className="team-inputs">
              <h3 className={`team-label ${getTeamColorClass(team1Color)}`}>
                {team1Color} Team
              </h3>
              <div className="position-inputs">
                {team1Players.map((player, idx) => (
                  <div key={player.slotId} className="position-input-row">
                    <label className="position-label">
                      {player.position}{player.position === "ST" && team1Players.filter((p) => p.position === "ST").length > 1 ? ` ${team1Players.slice(0, idx + 1).filter((p) => p.position === "ST").length}` : ""}
                    </label>
                    <input
                      type="text"
                      className="player-name-input"
                      placeholder="Player name"
                      value={player.name || ""}
                      onChange={(e) => updatePlayerName(1, player.slotId, e.target.value)}
                      list={`team1-${player.slotId}-players`}
                    />
                    <datalist id={`team1-${player.slotId}-players`}>
                      {allKnownPlayers.map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                ))}
              </div>
            </div>

            <div className="team-inputs">
              <h3 className={`team-label ${getTeamColorClass(team2Color)}`}>
                {team2Color} Team
              </h3>
              <div className="position-inputs">
                {team2Players.map((player, idx) => (
                  <div key={player.slotId} className="position-input-row">
                    <label className="position-label">
                      {player.position}{player.position === "ST" && team2Players.filter((p) => p.position === "ST").length > 1 ? ` ${team2Players.slice(0, idx + 1).filter((p) => p.position === "ST").length}` : ""}
                    </label>
                    <input
                      type="text"
                      className="player-name-input"
                      placeholder="Player name"
                      value={player.name || ""}
                      onChange={(e) => updatePlayerName(2, player.slotId, e.target.value)}
                      list={`team2-${player.slotId}-players`}
                    />
                    <datalist id={`team2-${player.slotId}-players`}>
                      {allKnownPlayers.map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="lineup-actions">
            <button className="btn-share" onClick={copyShareUrl}>
              Copy Share URL
            </button>
            <button className="btn-clear" onClick={handleClear}>
              Clear All
            </button>
          </div>
          {shareStatus ? (
            <p className="lineup-share-status" role="status">
              {shareStatus}
            </p>
          ) : null}
        </div>

        {/* Field View */}
        <div className="lineup-field-container">
          <div className="field-wrapper">
            <div className="lineup-field-header">
              <div className="lineup-title">
                <span className="lineup-vs">
                  <span className={`team-badge ${getTeamColorClass(team1Color)}`}>
                    {team1Color}
                  </span>
                  <span className="vs-text">VS</span>
                  <span className={`team-badge ${getTeamColorClass(team2Color)}`}>
                    {team2Color}
                  </span>
                </span>
              </div>
            </div>

            <div className="field-view-portrait-wrapper">
            <div className="football-field">
              {/* Field markings */}
              <div className="field-grass">
                <div className="center-line"></div>
                <div className="center-circle"></div>
                <div className="penalty-area left"></div>
                <div className="penalty-area right"></div>
                <div className="goal-area left"></div>
                <div className="goal-area right"></div>
                <div className="goal left"></div>
                <div className="goal right"></div>
              </div>

              {/* Team 1 Players */}
              {team1Players.map((player, idx) => {
                const position = POSITION_COORDS.team1[player.position];
                if (!position || !player.name) return null;
                const samePosPlayers = team1Players.filter((p) => p.position === player.position);
                const posIdx = team1Players
                  .slice(0, idx + 1)
                  .filter((p) => p.position === player.position).length - 1;
                const spread = samePosPlayers.length > 1 ? (posIdx - (samePosPlayers.length - 1) / 2) : 0;
                const posX = player.position === "ST" ? position.x : position.x + spread * 4;
                const posY = position.y + spread * 8;

                return (
                  <div
                    key={`team1-${player.slotId}`}
                    className={`player-marker ${getTeamColorClass(team1Color)}`}
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                    }}
                  >
                    <div className="player-circle">
                      <span className="player-position">{player.position}</span>
                    </div>
                    <div className="player-name-tag">{player.name}</div>
                  </div>
                );
              })}

              {/* Team 2 Players */}
              {team2Players.map((player, idx) => {
                const position = POSITION_COORDS.team2[player.position];
                if (!position || !player.name) return null;
                const samePosPlayers = team2Players.filter((p) => p.position === player.position);
                const posIdx = team2Players
                  .slice(0, idx + 1)
                  .filter((p) => p.position === player.position).length - 1;
                const spread = samePosPlayers.length > 1 ? (posIdx - (samePosPlayers.length - 1) / 2) : 0;
                const posX = player.position === "ST" ? position.x : position.x + spread * 4;
                const posY = position.y + spread * 8;

                return (
                  <div
                    key={`team2-${player.slotId}`}
                    className={`player-marker ${getTeamColorClass(team2Color)}`}
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                    }}
                  >
                    <div className="player-circle">
                      <span className="player-position">{player.position}</span>
                    </div>
                    <div className="player-name-tag">{player.name}</div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

