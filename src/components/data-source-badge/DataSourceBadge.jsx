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
  const isMixed = source === "mixed";
  const label = isSupabase
    ? "Supabase"
    : isMixed
      ? "Mixed"
      : "JSON fallback";
  return (
    <div
      className={`data-source-badge ${isSupabase ? "is-supabase" : isMixed ? "is-mixed" : "is-fallback"}`}
    >
      {context}: {label}
    </div>
  );
};

