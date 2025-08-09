import React from "react";
import { LinearProgress, Typography, Stack } from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ShieldIcon from "@mui/icons-material/Shield";

function getPercent(value, total) {
  return total ? ((value / total) * 100).toFixed(1) : 0;
}

function PlayerRow({ player }) {
  const totalGames = player.wins + player.losses + player.draws;
  const winPercent = getPercent(player.wins, totalGames);
  const lossPercent = getPercent(player.losses, totalGames);
  const drawPercent = getPercent(player.draws, totalGames);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1"><b>Player Insights</b></Typography>
      <div>
        <Typography variant="body2">Win %</Typography>
        <LinearProgress
          variant="determinate"
          value={Number(winPercent)}
          color="success"
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="caption">{winPercent}%</Typography>
      </div>
      <div>
        <Typography variant="body2">Loss %</Typography>
        <LinearProgress
          variant="determinate"
          value={Number(lossPercent)}
          color="error"
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="caption">{lossPercent}%</Typography>
      </div>
      <div>
        <Typography variant="body2">Draw %</Typography>
        <LinearProgress
          variant="determinate"
          value={Number(drawPercent)}
          color="warning"
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="caption">{drawPercent}%</Typography>
      </div>
      <Stack direction="row" spacing={2}>
        <Typography>
          <SportsSoccerIcon /> Goals: <b>{player.goals}</b>
        </Typography>
        <Typography>
          <EmojiEventsIcon color={player.hatTricks > 0 ? "warning" : "disabled"} />
          Hat Tricks: <b>{player.hatTricks}</b>
        </Typography>
        <Typography>
          <ShieldIcon color={player.cleanSheets > 0 ? "success" : "disabled"} />
          Clean Sheets: <b>{player.cleanSheets}</b>
        </Typography>
      </Stack>
    </Stack>
  );
}

export default PlayerRow;
