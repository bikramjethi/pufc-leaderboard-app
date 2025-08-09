import React, { useState } from "react";
import Leaderboard from "./Leaderboard";
import playersData from "./data/players.json";

function App() {
  const [players, setPlayers] = useState(playersData);

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ textAlign: "center", color: "#195a1c" }}>
        Football Leaderboard
      </h1>
      <Leaderboard players={players} />
    </div>
  );
}

export default App;
