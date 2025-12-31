export const Row = ({ 
  player, 
  rank, 
  topValues, 
  showHighlight = true,
  showCheckbox = true,
  showPlayerModal = true,
  isSelected = false, 
  onSelect,
  onPlayerClick
}) => {
  const position = player?.position ?? "N/A";
  const positionClass = `position-badge position-${position.toLowerCase()}`;
  
  const getRankClass = () => {
    return "rank";
  };

  // Returns highlight class based on rank (gold, silver, bronze) or empty string
  // Exclude "Others" from highlights
  const getHighlightClass = (key) => {
    if (!showHighlight || !topValues || !topValues[key] || player.name === "Others") return "";
    const playerVal = player[key] ?? 0;
    const { first, second, third } = topValues[key];
    
    // For percentage values, use rounded comparison
    if (key === "winPct" || key === "lossPct") {
      const rounded = Math.round(playerVal);
      if (first !== null && rounded === Math.round(first)) return "stat-gold";
      if (second !== null && rounded === Math.round(second)) return "stat-silver";
      if (third !== null && rounded === Math.round(third)) return "stat-bronze";
      return "";
    }
    
    // For other stats, exact comparison
    if (first !== null && playerVal === first) return "stat-gold";
    if (second !== null && playerVal === second) return "stat-silver";
    if (third !== null && playerVal === third) return "stat-bronze";
    return "";
  };

  // Get trophy emoji for goals value only
  // Exclude "Others" from medals
  const getTrophyEmoji = () => {
    if (!topValues || !topValues.goals || player.name === "Others") return null;
    
    const playerGoals = player.goals ?? 0;
    const { first, second, third } = topValues.goals;
    
    // Exact match for goals
    if (first !== null && playerGoals === first) return "🥇";
    if (second !== null && playerGoals === second) return "🥈";
    if (third !== null && playerGoals === third) return "🥉";
    
    return null;
  };

  const safeNumber = (val) => (typeof val === "number" ? val : 0);

  return (
    <tr className={`player-row ${isSelected ? "player-row-selected" : ""}`}>
      {showCheckbox && (
        <td className="select-cell">
          <input
            type="checkbox"
            className="player-checkbox"
            checked={isSelected}
            onChange={onSelect}
            aria-label={`Select ${player?.name ?? "player"} for comparison`}
          />
        </td>
      )}
      <td className={getRankClass()}>{rank}</td>
      <td className="player-name">
        {showPlayerModal ? (
          <button 
            className="player-name-btn" 
            onClick={onPlayerClick}
            aria-label={`View ${player.name}'s profile`}
          >
            {player.name}
          </button>
        ) : (
          player.name
        )}
      </td>
      <td>
        <span className={positionClass}>{player.position}</span>
      </td>
      <td className={`stat ${getHighlightClass("matches")}`}>{player.matches}</td>
      <td className={`stat ${getHighlightClass("wins")}`}>{player.wins}</td>
      <td className={`stat ${getHighlightClass("draws")}`}>{player.draws}</td>
      <td className={`stat ${getHighlightClass("losses")}`}>{player.losses}</td>
      <td className={`stat stat-pct ${getHighlightClass("winPct")}`}>{safeNumber(player.winPct).toFixed(0)}%</td>
      <td className={`stat stat-pct ${getHighlightClass("lossPct")}`}>{safeNumber(player.lossPct).toFixed(0)}%</td>
      <td className={`stat ${getHighlightClass("cleanSheets")}`}>{player.cleanSheets}</td>
      <td className={`stat stat-goals ${getHighlightClass("goals")}`}>
        {player.goals}
        {getTrophyEmoji() && (
          <span className="trophy-emoji">
            {getTrophyEmoji()}
          </span>
        )}
      </td>
      <td className={`stat ${getHighlightClass("hatTricks")}`}>{player.hatTricks}</td>
    </tr>
  );
};
