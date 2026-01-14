import { useState, useMemo, useEffect } from "react";
import "./MatchEntry.css";

// Available team colors
const TEAM_COLORS = ["RED", "BLUE", "BLACK", "WHITE", "YELLOW"];

// Position codes for 8v8 formation
const POSITIONS = ["GK", "RB", "CB", "LB", "RM", "CM", "LM", "ST"];

// Load player profiles dynamically
import playerProfiles from "./data/player-profiles.json";

// Create a player template
const createPlayer = () => ({
  name: "",
  position: "ST",
  goals: 0,
  ownGoals: 0,
  cleanSheet: false,
  groupStatus: "REGULAR",
});

export const MatchEntry = () => {
  // Form state
  const [year, setYear] = useState("2026");
  const [matchId, setMatchId] = useState("");
  const [team1Color, setTeam1Color] = useState("RED");
  const [team2Color, setTeam2Color] = useState("BLUE");
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [isFullHouse, setIsFullHouse] = useState(false);
  const [team1Players, setTeam1Players] = useState([createPlayer()]);
  const [team2Players, setTeam2Players] = useState([createPlayer()]);
  
  // Others goals (unattributed goals for each team)
  const [team1OthersGoals, setTeam1OthersGoals] = useState(0);
  const [team2OthersGoals, setTeam2OthersGoals] = useState(0);
  
  // Output state
  const [generatedJson, setGeneratedJson] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  // Get all known player names for autocomplete
  const knownPlayers = useMemo(() => {
    return playerProfiles.map(p => p.name).sort();
  }, []);

  // Update clean sheets when scores change
  useEffect(() => {
    // Auto-calculate clean sheet for GK based on opposition score
    setTeam1Players(prev => prev.map(p => ({
      ...p,
      cleanSheet: p.position === "GK" ? team2Score === 0 : p.cleanSheet,
    })));
    setTeam2Players(prev => prev.map(p => ({
      ...p,
      cleanSheet: p.position === "GK" ? team1Score === 0 : p.cleanSheet,
    })));
  }, [team1Score, team2Score]);

  // Add player to team
  const addPlayer = (team) => {
    if (team === 1) {
      setTeam1Players([...team1Players, createPlayer()]);
    } else {
      setTeam2Players([...team2Players, createPlayer()]);
    }
  };

  // Remove player from team
  const removePlayer = (team, index) => {
    if (team === 1) {
      setTeam1Players(team1Players.filter((_, i) => i !== index));
    } else {
      setTeam2Players(team2Players.filter((_, i) => i !== index));
    }
  };

  // Update player field
  const updatePlayer = (team, index, field, value) => {
    const players = team === 1 ? [...team1Players] : [...team2Players];
    players[index] = { ...players[index], [field]: value };
    
    // Auto-update clean sheet for GK
    if (field === "position" || field === "cleanSheet") {
      const oppositionScore = team === 1 ? team2Score : team1Score;
      if (players[index].position === "GK") {
        players[index].cleanSheet = oppositionScore === 0;
      }
    }
    
    // Auto-lookup group status from player profiles
    if (field === "name") {
      const profile = playerProfiles.find(p => p.name.toLowerCase() === value.toLowerCase());
      if (profile?.groupAvailibility === "ONLOAN") {
        players[index].groupStatus = "ONLOAN";
      } else {
        players[index].groupStatus = "REGULAR";
      }
    }
    
    if (team === 1) {
      setTeam1Players(players);
    } else {
      setTeam2Players(players);
    }
  };

  // Calculate totals (including Others goals)
  const team1GoalsTotal = team1Players.reduce((sum, p) => sum + (p.goals || 0), 0) + team1OthersGoals;
  const team2GoalsTotal = team2Players.reduce((sum, p) => sum + (p.goals || 0), 0) + team2OthersGoals;
  const team1OwnGoals = team1Players.reduce((sum, p) => sum + (p.ownGoals || 0), 0);
  const team2OwnGoals = team2Players.reduce((sum, p) => sum + (p.ownGoals || 0), 0);
  
  // Team score = team's goals + opposition's own goals
  const calculatedTeam1Score = team1GoalsTotal + team2OwnGoals;
  const calculatedTeam2Score = team2GoalsTotal + team1OwnGoals;

  // Determine if this is a historical backfill
  const isBackfill = parseInt(year) < 2026;

  // Generate match JSON
  const generateMatchJson = () => {
    if (!matchId.trim()) {
      setError("Match ID is required (e.g., 04-01-2025)");
      return null;
    }
    
    if (team1Players.filter(p => p.name.trim()).length === 0 || 
        team2Players.filter(p => p.name.trim()).length === 0) {
      setError("Each team must have at least one player");
      return null;
    }

    // Determine day type from date
    const dateParts = matchId.split("-");
    if (dateParts.length !== 3) {
      setError("Invalid match ID format. Use DD-MM-YYYY");
      return null;
    }
    
    const dateStr = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
    const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    setError("");

    // Build team 1 players array (including Others if there are unattributed goals)
    const team1Attendance = team1Players
      .filter(p => p.name.trim())
      .map(p => ({
        name: p.name.trim(),
        goals: p.goals || 0,
        ownGoals: p.ownGoals || 0,
        cleanSheet: p.cleanSheet || false,
        groupStatus: p.groupStatus,
        position: p.position,
      }));
    
    // Add "Others" entry if there are unattributed goals
    if (team1OthersGoals > 0) {
      team1Attendance.push({
        name: "Others",
        goals: team1OthersGoals,
        ownGoals: 0,
        cleanSheet: false,
        groupStatus: "REGULAR",
        position: "ST",
      });
    }

    // Build team 2 players array (including Others if there are unattributed goals)
    const team2Attendance = team2Players
      .filter(p => p.name.trim())
      .map(p => ({
        name: p.name.trim(),
        goals: p.goals || 0,
        ownGoals: p.ownGoals || 0,
        cleanSheet: p.cleanSheet || false,
        groupStatus: p.groupStatus,
        position: p.position,
      }));
    
    // Add "Others" entry if there are unattributed goals
    if (team2OthersGoals > 0) {
      team2Attendance.push({
        name: "Others",
        goals: team2OthersGoals,
        ownGoals: 0,
        cleanSheet: false,
        groupStatus: "REGULAR",
        position: "ST",
      });
    }

    const matchData = {
      id: matchId.trim(),
      date: dateStr,
      day: isWeekend ? "Weekend" : "Midweek",
      matchPlayed: true,
      matchCancelled: false,
      isFullHouse,
      ...(isBackfill && { isBackfilled: true }),
      attendance: {
        [team1Color]: team1Attendance,
        [team2Color]: team2Attendance,
      },
      scoreline: {
        [team1Color]: team1Score,
        [team2Color]: team2Score,
      },
      totalGoals: team1Score + team2Score,
    };

    return { year, matchData };
  };

  // Generate and display JSON
  const handleGenerate = () => {
    const result = generateMatchJson();
    if (result) {
      const output = {
        year: result.year,
        matchId: result.matchData.id,
        matchData: result.matchData,
      };
      setGeneratedJson(JSON.stringify(output, null, 2));
      setCopySuccess(false);
      setSavedSuccess(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedJson);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  // Save via API (requires the save-match.js server to be running)
  const handleSave = async () => {
    const result = generateMatchJson();
    if (!result) return;

    try {
      const response = await fetch("http://localhost:3001/api/save-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: result.year, matchData: result.matchData }),
      });

      if (response.ok) {
        setSavedSuccess(true);
        setError("");
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save match");
      }
    } catch {
      setError("Could not connect to save server. Make sure to run: node scripts/save-match-server.js");
    }
  };

  // Clear form
  const handleClear = () => {
    setMatchId("");
    setTeam1Score(0);
    setTeam2Score(0);
    setIsFullHouse(false);
    setTeam1Players([createPlayer()]);
    setTeam2Players([createPlayer()]);
    setTeam1OthersGoals(0);
    setTeam2OthersGoals(0);
    setGeneratedJson("");
    setError("");
  };

  return (
    <div className="match-entry">
      <div className="match-entry-header">
        <h2>📝 Match Data Entry</h2>
        <p className="subtitle">
          Enter match data in one go. {isBackfill && <span className="backfill-badge">📋 Backfill Mode</span>}
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        {/* Basic Info Row */}
        <div className="form-row basic-info">
          <div className="form-group">
            <label>Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="2026">2026</option>
              <option value="2025">2025 (Backfill)</option>
              <option value="2024">2024 (Backfill)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Match ID</label>
            <input
              type="text"
              placeholder="DD-MM-YYYY"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isFullHouse}
                onChange={(e) => setIsFullHouse(e.target.checked)}
              />
              Full House 🏠
            </label>
          </div>
        </div>

        {/* Team Colors & Scores */}
        <div className="scoreline-section">
          <div className="team-score-input">
            <select 
              value={team1Color} 
              onChange={(e) => setTeam1Color(e.target.value)}
              className={`color-select color-${team1Color.toLowerCase()}`}
            >
              {TEAM_COLORS.filter(c => c !== team2Color).map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={team1Score}
              onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
              className="score-input"
            />
          </div>
          
          <span className="vs-divider">VS</span>
          
          <div className="team-score-input">
            <input
              type="number"
              min="0"
              value={team2Score}
              onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
              className="score-input"
            />
            <select 
              value={team2Color} 
              onChange={(e) => setTeam2Color(e.target.value)}
              className={`color-select color-${team2Color.toLowerCase()}`}
            >
              {TEAM_COLORS.filter(c => c !== team1Color).map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Score Validation */}
        {(calculatedTeam1Score !== team1Score || calculatedTeam2Score !== team2Score) && (
          <div className="score-warning">
            ⚠️ Player goals ({calculatedTeam1Score} - {calculatedTeam2Score}) don't match scoreline ({team1Score} - {team2Score})
          </div>
        )}

        {/* Team Players */}
        <div className="teams-container">
          {/* Team 1 */}
          <div className={`team-section team-${team1Color.toLowerCase()}`}>
            <h3>{team1Color} Team</h3>
            <div className="players-table">
              <div className="players-header">
                <span className="col-name">Player</span>
                <span className="col-pos">Pos</span>
                <span className="col-goals">Goals</span>
                <span className="col-og">OG</span>
                <span className="col-cs">CS</span>
                <span className="col-status">Status</span>
                <span className="col-actions"></span>
              </div>
              {team1Players.map((player, idx) => (
                <div key={idx} className="match-player-row">
                  <input
                    type="text"
                    className="col-name"
                    placeholder="Player name"
                    value={player.name}
                    onChange={(e) => updatePlayer(1, idx, "name", e.target.value)}
                    list="player-names"
                  />
                  <select
                    className="col-pos"
                    value={player.position}
                    onChange={(e) => updatePlayer(1, idx, "position", e.target.value)}
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="col-goals"
                    min="0"
                    value={player.goals}
                    onChange={(e) => updatePlayer(1, idx, "goals", parseInt(e.target.value) || 0)}
                  />
                  <input
                    type="number"
                    className="col-og"
                    min="0"
                    value={player.ownGoals}
                    onChange={(e) => updatePlayer(1, idx, "ownGoals", parseInt(e.target.value) || 0)}
                  />
                  <input
                    type="checkbox"
                    className="col-cs"
                    checked={player.cleanSheet}
                    onChange={(e) => updatePlayer(1, idx, "cleanSheet", e.target.checked)}
                    disabled={player.position === "GK"}
                  />
                  <select
                    className="col-status"
                    value={player.groupStatus}
                    onChange={(e) => updatePlayer(1, idx, "groupStatus", e.target.value)}
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="ONLOAN">On Loan</option>
                  </select>
                  <button
                    className="remove-btn"
                    onClick={() => removePlayer(1, idx)}
                    disabled={team1Players.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="add-player-btn" onClick={() => addPlayer(1)}>
                + Add Player
              </button>
              
              {/* Others/Unattributed Goals */}
              <div className="others-goals-row">
                <label>Unattributed Goals ("Others")</label>
                <input
                  type="number"
                  min="0"
                  value={team1OthersGoals}
                  onChange={(e) => setTeam1OthersGoals(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <span className="others-hint">Goals with unknown scorer</span>
              </div>
            </div>
          </div>

          {/* Team 2 */}
          <div className={`team-section team-${team2Color.toLowerCase()}`}>
            <h3>{team2Color} Team</h3>
            <div className="players-table">
              <div className="players-header">
                <span className="col-name">Player</span>
                <span className="col-pos">Pos</span>
                <span className="col-goals">Goals</span>
                <span className="col-og">OG</span>
                <span className="col-cs">CS</span>
                <span className="col-status">Status</span>
                <span className="col-actions"></span>
              </div>
              {team2Players.map((player, idx) => (
                <div key={idx} className="match-player-row">
                  <input
                    type="text"
                    className="col-name"
                    placeholder="Player name"
                    value={player.name}
                    onChange={(e) => updatePlayer(2, idx, "name", e.target.value)}
                    list="player-names"
                  />
                  <select
                    className="col-pos"
                    value={player.position}
                    onChange={(e) => updatePlayer(2, idx, "position", e.target.value)}
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="col-goals"
                    min="0"
                    value={player.goals}
                    onChange={(e) => updatePlayer(2, idx, "goals", parseInt(e.target.value) || 0)}
                  />
                  <input
                    type="number"
                    className="col-og"
                    min="0"
                    value={player.ownGoals}
                    onChange={(e) => updatePlayer(2, idx, "ownGoals", parseInt(e.target.value) || 0)}
                  />
                  <input
                    type="checkbox"
                    className="col-cs"
                    checked={player.cleanSheet}
                    onChange={(e) => updatePlayer(2, idx, "cleanSheet", e.target.checked)}
                    disabled={player.position === "GK"}
                  />
                  <select
                    className="col-status"
                    value={player.groupStatus}
                    onChange={(e) => updatePlayer(2, idx, "groupStatus", e.target.value)}
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="ONLOAN">On Loan</option>
                  </select>
                  <button
                    className="remove-btn"
                    onClick={() => removePlayer(2, idx)}
                    disabled={team2Players.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="add-player-btn" onClick={() => addPlayer(2)}>
                + Add Player
              </button>
              
              {/* Others/Unattributed Goals */}
              <div className="others-goals-row">
                <label>Unattributed Goals ("Others")</label>
                <input
                  type="number"
                  min="0"
                  value={team2OthersGoals}
                  onChange={(e) => setTeam2OthersGoals(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <span className="others-hint">Goals with unknown scorer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Datalist for player autocomplete */}
        <datalist id="player-names">
          {knownPlayers.map(name => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={handleGenerate}>
            📋 Generate JSON
          </button>
          <button className="btn btn-success" onClick={handleSave}>
            💾 Save Match
          </button>
          <button className="btn btn-secondary" onClick={handleClear}>
            🔄 Clear Form
          </button>
        </div>

        {/* Success Message */}
        {savedSuccess && (
          <div className="success-message">
            ✅ Match saved successfully! Run sync-stats to update leaderboards.
          </div>
        )}

        {/* Generated JSON Output */}
        {generatedJson && (
          <div className="json-output">
            <div className="json-header">
              <h4>Generated Match JSON</h4>
              <button 
                className={`copy-btn ${copySuccess ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copySuccess ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
            <pre>{generatedJson}</pre>
            <div className="json-instructions">
              <p>
                <strong>Option 1:</strong> Click "Save Match" to save directly (requires server)
              </p>
              <p>
                <strong>Option 2:</strong> Copy the JSON and run: 
                <code>echo 'JSON_HERE' | node scripts/process-match.js</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

