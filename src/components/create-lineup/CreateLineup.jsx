import { useState, useMemo, useRef } from "react";
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
  
  // Team 1 players: { position: "GK", name: "" }
  const [team1Players, setTeam1Players] = useState(() => 
    POSITIONS.map(pos => ({ position: pos, name: "" }))
  );
  
  // Team 2 players: { position: "GK", name: "" }
  const [team2Players, setTeam2Players] = useState(() => 
    POSITIONS.map(pos => ({ position: pos, name: "" }))
  );

  const fieldRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

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
  };

  // Export as image
  const handleExport = async () => {
    if (!fieldRef.current) return;
    
    setIsExporting(true);
    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import("html2canvas")).default;
      
      const canvas = await html2canvas(fieldRef.current, {
        backgroundColor: "#1a1a2e",
        scale: 2,
        logging: false,
      });
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Failed to generate image");
          setIsExporting(false);
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `lineup-${team1Color}-vs-${team2Color}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setIsExporting(false);
      }, "image/png");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export image. Please try again.");
      setIsExporting(false);
    }
  };

  // Copy to clipboard as image
  const handleCopy = async () => {
    if (!fieldRef.current) return;
    
    setIsExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      
      const canvas = await html2canvas(fieldRef.current, {
        backgroundColor: "#1a1a2e",
        scale: 2,
        logging: false,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("Failed to copy image");
          setIsExporting(false);
          return;
        }
        
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          alert("Lineup copied to clipboard!");
        } catch (err) {
          alert("Failed to copy to clipboard. Please use Export instead.");
        }
        
        setIsExporting(false);
      }, "image/png");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy image. Please try again.");
      setIsExporting(false);
    }
  };

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
            <button 
              className="btn-clear" 
              onClick={handleClear}
              disabled={isExporting}
            >
              Clear All
            </button>
            <button 
              className="btn-copy" 
              onClick={handleCopy}
              disabled={isExporting}
            >
              {isExporting ? "Processing..." : "Copy Image"}
            </button>
            <button 
              className="btn-export" 
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export Image"}
            </button>
          </div>
        </div>

        {/* Field View */}
        <div className="lineup-field-container">
          <div className="field-wrapper" ref={fieldRef}>
            {/* Header */}
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

            {/* Football Field */}
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
  );
};

