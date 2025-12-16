export const Row = ({ player, rank }) => {
  const positionClass = `position-badge position-${player.position.toLowerCase()}`;
  
  const getRankClass = () => {
    if (rank === 1) return "rank rank-gold";
    if (rank === 2) return "rank rank-silver";
    if (rank === 3) return "rank rank-bronze";
    return "rank";
  };

  return (
    <tr className="player-row">
      <td className={getRankClass()}>{rank}</td>
      <td className="player-name">{player.name}</td>
      <td>
        <span className={positionClass}>{player.position}</span>
      </td>
      <td className="stat">{player.wins}</td>
      <td className="stat">{player.draws}</td>
      <td className="stat">{player.losses}</td>
      <td className="stat">{player.cleanSheets}</td>
      <td className="stat stat-goals">{player.goals}</td>
      <td className="stat">{player.hatTricks}</td>
    </tr>
  );
};
