import { getDisplayName } from "../../utils/playerDisplayName";

export const Row = ({
  player,
  rank,
  columns,
  topValues,
  showHighlight = true,
  showCheckbox = true,
  showPlayerModal = true,
  isSelected = false,
  onSelect,
  onPlayerClick,
}) => {
  const positions =
    player?.position && Array.isArray(player.position) ? player.position : ["N/A"];

  const getRankClass = () => {
    return "rank";
  };

  const getHighlightClass = (key) => {
    if (!showHighlight || !topValues || !topValues[key] || player.name === "Others") return "";
    const playerVal = player[key] ?? 0;
    const { first, second, third } = topValues[key];

    if (key === "winPct" || key === "lossPct") {
      const rounded = Math.round(playerVal);
      if (first !== null && rounded === Math.round(first)) return "stat-gold";
      if (second !== null && rounded === Math.round(second)) return "stat-silver";
      if (third !== null && rounded === Math.round(third)) return "stat-bronze";
      return "";
    }

    if (first !== null && playerVal === first) return "stat-gold";
    if (second !== null && playerVal === second) return "stat-silver";
    if (third !== null && playerVal === third) return "stat-bronze";
    return "";
  };

  const getTrophyEmoji = () => {
    if (!topValues || !topValues.goals || player.name === "Others") return null;

    const playerGoals = player.goals ?? 0;
    const { first, second, third } = topValues.goals;

    if (first !== null && playerGoals === first) return "🥇";
    if (second !== null && playerGoals === second) return "🥈";
    if (third !== null && playerGoals === third) return "🥉";

    return null;
  };

  const safeNumber = (val) => (typeof val === "number" ? val : 0);

  const renderColumnCell = (col) => {
    switch (col.key) {
      case "name":
        return (
          <td key={col.key} className="player-name">
            {showPlayerModal ? (
              <button
                type="button"
                className="player-name-btn"
                onClick={onPlayerClick}
                aria-label={`View ${player.name}'s profile`}
              >
                {getDisplayName(player.name)}
              </button>
            ) : (
              getDisplayName(player.name)
            )}
          </td>
        );
      case "position":
        return (
          <td key={col.key} className="position-cell">
            {positions.map((pos, idx) => (
              <span
                key={idx}
                className={`position-badge position-${pos.toLowerCase()}`}
                title={pos}
              >
                {pos}
              </span>
            ))}
          </td>
        );
      case "winPct":
        return (
          <td
            key={col.key}
            className={`stat stat-pct ${getHighlightClass("winPct")}`}
          >
            {safeNumber(player.winPct).toFixed(0)}%
          </td>
        );
      case "lossPct":
        return (
          <td
            key={col.key}
            className={`stat stat-pct ${getHighlightClass("lossPct")}`}
          >
            {safeNumber(player.lossPct).toFixed(0)}%
          </td>
        );
      case "goals": {
        const trophy = getTrophyEmoji();
        return (
          <td key={col.key} className={`stat stat-goals ${getHighlightClass("goals")}`}>
            {player.goals}
            {trophy ? <span className="trophy-emoji">{trophy}</span> : null}
          </td>
        );
      }
      case "ownGoals":
        return (
          <td key={col.key} className={`stat ${getHighlightClass("ownGoals")}`}>
            {player.ownGoals ?? 0}
          </td>
        );
      default:
        return (
          <td key={col.key} className={`stat ${getHighlightClass(col.key)}`}>
            {player[col.key] ?? 0}
          </td>
        );
    }
  };

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
      {(columns || []).map((col) => renderColumnCell(col))}
    </tr>
  );
};
