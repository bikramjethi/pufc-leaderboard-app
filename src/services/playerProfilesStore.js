import fallbackProfiles from "../data/player-profiles.json";

let profiles = Array.isArray(fallbackProfiles) ? fallbackProfiles : [];
const listeners = new Set();

export const getPlayerProfiles = () => profiles;

export const setPlayerProfiles = (nextProfiles) => {
  profiles = Array.isArray(nextProfiles) ? nextProfiles : [];
  listeners.forEach((listener) => listener(profiles));
};

export const subscribePlayerProfiles = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
