import { Row } from "./Row.jsx";

export const Leaderboard = ({ players }) => {
  // Sort players by wins (descending) as default ranking
  const sortedPlayers = [...players].sort((a, b) => b.wins - a.wins);

  return (
    <div className="leaderboard">
      <div className="table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-col">#</th>
              <th className="player-col">Player</th>
              <th className="position-col">Pos</th>
              <th className="stat-col">W</th>
              <th className="stat-col">D</th>
              <th className="stat-col">L</th>
              <th className="stat-col">CS</th>
              <th className="stat-col">G</th>
              <th className="stat-col">HT</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => (
              <Row key={player.id} player={player} rank={index + 1} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <span><strong>W</strong> Wins</span>
        <span><strong>D</strong> Draws</span>
        <span><strong>L</strong> Losses</span>
        <span><strong>CS</strong> Clean Sheets</span>
        <span><strong>G</strong> Goals</span>
        <span><strong>HT</strong> Hat Tricks</span>
      </div>
    </div>
  );
};
