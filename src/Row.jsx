export const Row = ({ player, rank, maxValues }) => {
  const positionClass = `position-badge position-${player.position.toLowerCase()}`;
  
  const getRankClass = () => {
    if (rank === 1) return "rank rank-gold";
    if (rank === 2) return "rank rank-silver";
    if (rank === 3) return "rank rank-bronze";
    return "rank";
  };

  const isMax = (key) => maxValues && player[key] === maxValues[key] && maxValues[key] > 0;

  return (
    <tr className="player-row">
      <td className={getRankClass()}>{rank}</td>
      <td className="player-name">{player.name}</td>
      <td>
        <span className={positionClass}>{player.position}</span>
      </td>
      <td className={`stat ${isMax("matches") ? "stat-highlight" : ""}`}>{player.matches}</td>
      <td className={`stat ${isMax("wins") ? "stat-highlight" : ""}`}>{player.wins}</td>
      <td className={`stat ${isMax("draws") ? "stat-highlight" : ""}`}>{player.draws}</td>
      <td className={`stat ${isMax("losses") ? "stat-highlight" : ""}`}>{player.losses}</td>
      <td className={`stat stat-pct ${isMax("winPct") ? "stat-highlight" : ""}`}>{player.winPct.toFixed(0)}%</td>
      <td className={`stat stat-pct ${isMax("lossPct") ? "stat-highlight" : ""}`}>{player.lossPct.toFixed(0)}%</td>
      <td className={`stat ${isMax("cleanSheets") ? "stat-highlight" : ""}`}>{player.cleanSheets}</td>
      <td className={`stat stat-goals ${isMax("goals") ? "stat-highlight" : ""}`}>{player.goals}</td>
      <td className={`stat ${isMax("hatTricks") ? "stat-highlight" : ""}`}>{player.hatTricks}</td>
    </tr>
  );
};
