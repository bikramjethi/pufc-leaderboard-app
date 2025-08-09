import React, { useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Collapse, Box
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import PlayerRow from "./PlayerRow";

const columns = [
  { label: "Name", key: "name" },
  { label: "Position", key: "position" },
  { label: "Wins", key: "wins" },
  { label: "Losses", key: "losses" },
  { label: "Draws", key: "draws" },
  { label: "Clean Sheets", key: "cleanSheets" },
  { label: "Goals", key: "goals" },
  { label: "Hat Tricks", key: "hatTricks" }
];

function Leaderboard({ players }) {
  const [sortKey, setSortKey] = useState("wins");
  const [sortOrder, setSortOrder] = useState("desc");
  const [expandedIdx, setExpandedIdx] = useState(null);

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortOrder === "asc") {
      return a[sortKey] > b[sortKey] ? 1 : -1;
    } else {
      return a[sortKey] < b[sortKey] ? 1 : -1;
    }
  });

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table aria-label="leaderboard table">
        <TableHead>
          <TableRow>
            <TableCell />
            {columns.map((col) => (
              <TableCell
                key={col.key}
                onClick={() => handleSort(col.key)}
                style={{ cursor: "pointer", fontWeight: "bold", background: "#e8f5e9" }}
              >
                {col.label}
                {sortKey === col.key ? (sortOrder === "asc" ? " ▲" : " ▼") : ""}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedPlayers.map((player, idx) => (
            <React.Fragment key={player.name}>
              <TableRow hover>
                <TableCell>
                  <IconButton
                    size="small"
                    aria-label="expand row"
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  >
                    {expandedIdx === idx ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                  </IconButton>
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key}>{player[col.key]}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columns.length + 1}>
                  <Collapse in={expandedIdx === idx} timeout="auto" unmountOnExit>
                    <Box margin={2}>
                      <PlayerRow player={player} />
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default Leaderboard;
