import { useEffect, useState } from "react";
import { config } from "../leaderboard-config";
import { fetchPlayerProfiles } from "../services/supabase/data";
import {
  getPlayerProfiles,
  setPlayerProfiles,
  subscribePlayerProfiles,
} from "../services/playerProfilesStore";

let fetchInFlight = null;
let loadedFromSupabase = false;

export const usePlayerProfiles = () => {
  const [profiles, setProfiles] = useState(getPlayerProfiles());

  useEffect(() => subscribePlayerProfiles(setProfiles), []);

  useEffect(() => {
    if (!config.SUPABASE?.enabled || loadedFromSupabase || fetchInFlight) return;
    fetchInFlight = fetchPlayerProfiles()
      .then((rows) => {
        setPlayerProfiles(rows);
        loadedFromSupabase = true;
      })
      .catch(() => {})
      .finally(() => {
        fetchInFlight = null;
      });
  }, []);

  return profiles;
};
