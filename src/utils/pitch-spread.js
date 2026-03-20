/** @typedef {'GK' | 'DEF' | 'MID' | 'FWD' | 'OTHER'} PitchLine */

const DEF_SET = new Set(["CB", "LB", "RB", "LWB", "RWB"]);
const MID_SET = new Set(["CM", "CDM", "CAM", "LM", "RM"]);
const FWD_SET = new Set(["LW", "RW", "ST", "CF"]);

/** @param {string} position */
export function positionToLine(position) {
  const p = String(position || "")
    .trim()
    .toUpperCase();
  if (p === "GK") return "GK";
  if (DEF_SET.has(p)) return "DEF";
  if (MID_SET.has(p)) return "MID";
  if (FWD_SET.has(p)) return "FWD";
  return "OTHER";
}

/** @param {Record<string, number>} posCounts */
export function linesFromPosCounts(posCounts) {
  /** @type {Set<PitchLine>} */
  const lines = new Set();
  for (const pos of Object.keys(posCounts)) {
    lines.add(positionToLine(pos));
  }
  return lines;
}

/** @param {number} uniquePositionCount */
export function flexibilityTag(uniquePositionCount) {
  if (uniquePositionCount >= 4) return "utility";
  if (uniquePositionCount >= 2) return "flexible";
  return "specialist";
}

const LINE_ORDER = /** @type {const} */ (["GK", "DEF", "MID", "FWD", "OTHER"]);

const SINGLE_LINE_COPY = {
  GK: "Goalkeeper line only",
  DEF: "Defense line only",
  MID: "Midfield only",
  FWD: "Attack line only",
  OTHER: "Mixed / other roles",
};

/**
 * Human-readable spread: contrasts "defense-only rotation" vs "full pitch" utility.
 * @param {Set<PitchLine>} lines
 */
export function describePitchSpread(lines) {
  const active = LINE_ORDER.filter((l) => lines.has(l));
  if (active.length === 0) return "";

  if (active.length === 1) {
    const line = active[0];
    return SINGLE_LINE_COPY[line] || "Single line";
  }

  const hasDef = lines.has("DEF");
  const hasMid = lines.has("MID");
  const hasFwd = lines.has("FWD");
  const hasGk = lines.has("GK");
  const hasOther = lines.has("OTHER");

  if (hasDef && hasMid && hasFwd && !hasGk && !hasOther) {
    return "Cross-line · defense, midfield & attack";
  }

  if (hasDef && hasMid && hasFwd && (hasGk || hasOther)) {
    return "Full pitch · every band covered";
  }

  if (hasGk && active.length >= 2) {
    const rest = active.filter((l) => l !== "GK");
    if (rest.length === 1) {
      return `GK + ${rest[0] === "DEF" ? "defense" : rest[0] === "MID" ? "midfield" : rest[0] === "FWD" ? "attack" : "other"}`;
    }
    return "GK plus multiple outfield lines";
  }

  const short = active
    .filter((l) => l !== "OTHER")
    .map((l) => {
      if (l === "DEF") return "Def";
      if (l === "MID") return "Mid";
      if (l === "FWD") return "Atk";
      return "GK";
    });

  if (hasOther) short.push("Other");

  return short.join(" · ");
}

/** For aria-label on the mini pitch strip */
export function pitchSpreadAria(lines) {
  const parts = [];
  if (lines.has("GK")) parts.push("goalkeeper");
  if (lines.has("DEF")) parts.push("defense");
  if (lines.has("MID")) parts.push("midfield");
  if (lines.has("FWD")) parts.push("attack");
  if (lines.has("OTHER")) parts.push("other");
  return parts.length ? `Appears across: ${parts.join(", ")}` : "";
}
