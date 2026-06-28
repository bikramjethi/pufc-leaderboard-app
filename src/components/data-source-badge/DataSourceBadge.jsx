import { useEffect, useMemo, useState } from "react";
import { getCurrentSession } from "../../services/supabase/auth";

export const DataSourceBadge = ({ source = "json-fallback", context = "Data" }) => {
  const [canShow, setCanShow] = useState(false);

  const debugEnabled = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("debugDataSource") === "1";
  }, []);

  useEffect(() => {
    if (!debugEnabled) return;
    getCurrentSession()
      .then((session) => setCanShow(Boolean(session)))
      .catch(() => setCanShow(false));
  }, [debugEnabled]);

  if (!debugEnabled || !canShow) return null;

  const isSupabase = source === "supabase";
  return (
    <div className={`data-source-badge ${isSupabase ? "is-supabase" : "is-fallback"}`}>
      {context}: {isSupabase ? "Supabase" : "JSON fallback"}
    </div>
  );
};

