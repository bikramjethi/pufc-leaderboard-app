/**
 * Distinct hex colors for lineup positions (donut + legend).
 * Fallback for unknown codes keeps charts readable.
 */
const POSITION_HEX = {
  GK: "#a855f7",
  CB: "#ea580c",
  LB: "#f97316",
  RB: "#fb923c",
  LWB: "#fdba74",
  RWB: "#fed7aa",
  CDM: "#0891b2",
  CM: "#3b82f6",
  CAM: "#6366f1",
  LM: "#38bdf8",
  RM: "#60a5fa",
  LW: "#f87171",
  RW: "#fca5a5",
  ST: "#ef4444",
  CF: "#dc2626",
};

const FALLBACK_HUES = [280, 200, 25, 145, 320, 190, 40, 330];

/** @param {string} position */
export function getPositionColor(position) {
  const p = String(position || "").toUpperCase().trim();
  if (POSITION_HEX[p]) return POSITION_HEX[p];
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h + p.charCodeAt(i) * (i + 1)) % 360;
  const hue = FALLBACK_HUES[h % FALLBACK_HUES.length];
  return `hsl(${hue} 70% 52%)`;
}
