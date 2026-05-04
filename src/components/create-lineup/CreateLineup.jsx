import { useCallback, useEffect, useMemo, useState } from "react";
import "./CreateLineup.css";
import playerProfiles from "../../data/player-profiles.json";

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

const URL_STATE_KEY = "lineup";

const safeEncode = (obj) => {
  try {
    const json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return "";
  }
};

const safeDecode = (encoded) => {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const normalizeTeamPlayers = (teamPlayers) => {
  const byPos = new Map(
    Array.isArray(teamPlayers)
      ? teamPlayers
          .filter((p) => p?.position && POSITIONS.includes(String(p.position)))
          .map((p) => [String(p.position), String(p.name || "")])
      : []
  );
  return POSITIONS.map((position) => ({
    position,
    name: byPos.get(position) || "",
  }));
};

const isValidTeamColor = (color) => TEAM_COLORS.includes(String(color || "").toUpperCase());

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
  const [team1Color, setTeam1Color] = useState("RED");
  const [team2Color, setTeam2Color] = useState("BLUE");
  const [shareStatus, setShareStatus] = useState("");
  
  // Team 1 players: { position: "GK", name: "" }
  const [team1Players, setTeam1Players] = useState(() => 
    POSITIONS.map(pos => ({ position: pos, name: "" }))
  );
  
  // Team 2 players: { position: "GK", name: "" }
  const [team2Players, setTeam2Players] = useState(() => 
    POSITIONS.map(pos => ({ position: pos, name: "" }))
  );

  const lineupPayload = useMemo(() => ({
    v: 1,
    team1Color,
    team2Color,
    team1Players,
    team2Players,
  }), [team1Color, team2Color, team1Players, team2Players]);

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
  const updatePlayerName = (teamNum, position, name) => {
    if (teamNum === 1) {
      setTeam1Players(prev => 
        prev.map(p => p.position === position ? { ...p, name } : p)
      );
    } else {
      setTeam2Players(prev => 
        prev.map(p => p.position === position ? { ...p, name } : p)
      );
    }
  };

  // Clear all players
  const handleClear = () => {
    setTeam1Players(POSITIONS.map(pos => ({ position: pos, name: "" })));
    setTeam2Players(POSITIONS.map(pos => ({ position: pos, name: "" })));
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
    if (!decoded || typeof decoded !== "object") {
      setShareStatus("Invalid share URL.");
      return;
    }

    const nextTeam1Color = isValidTeamColor(decoded.team1Color) ? String(decoded.team1Color).toUpperCase() : "RED";
    const nextTeam2Color = isValidTeamColor(decoded.team2Color) ? String(decoded.team2Color).toUpperCase() : "BLUE";

    setTeam1Color(nextTeam1Color);
    setTeam2Color(nextTeam2Color);
    setTeam1Players(normalizeTeamPlayers(decoded.team1Players));
    setTeam2Players(normalizeTeamPlayers(decoded.team2Players));
    setShareStatus("Lineup loaded from share URL.");
  }, []);

  return (
    <div className="create-lineup">
      <div className="lineup-container">
        {/* Controls Section */}
        <div className="lineup-controls">
          <div className="controls-header">
            <h2>Create Lineup</h2>
            <p>Set up your 8v8 football lineup</p>
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
                {POSITIONS.map(pos => (
                  <div key={pos} className="position-input-row">
                    <label className="position-label">{pos}</label>
                    <input
                      type="text"
                      className="player-name-input"
                      placeholder="Player name"
                      value={team1Players.find(p => p.position === pos)?.name || ""}
                      onChange={(e) => updatePlayerName(1, pos, e.target.value)}
                      list={`team1-${pos}-players`}
                    />
                    <datalist id={`team1-${pos}-players`}>
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
                {POSITIONS.map(pos => (
                  <div key={pos} className="position-input-row">
                    <label className="position-label">{pos}</label>
                    <input
                      type="text"
                      className="player-name-input"
                      placeholder="Player name"
                      value={team2Players.find(p => p.position === pos)?.name || ""}
                      onChange={(e) => updatePlayerName(2, pos, e.target.value)}
                      list={`team2-${pos}-players`}
                    />
                    <datalist id={`team2-${pos}-players`}>
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
              {team1Players.map((player) => {
                const position = POSITION_COORDS.team1[player.position];
                if (!position || !player.name) return null;

                return (
                  <div
                    key={`team1-${player.position}`}
                    className={`player-marker ${getTeamColorClass(team1Color)}`}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
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
              {team2Players.map((player) => {
                const position = POSITION_COORDS.team2[player.position];
                if (!position || !player.name) return null;

                return (
                  <div
                    key={`team2-${player.position}`}
                    className={`player-marker ${getTeamColorClass(team2Color)}`}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
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

