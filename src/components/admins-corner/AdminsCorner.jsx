import { useEffect, useState } from "react";
import { MatchEntry } from "../match-entry";
import { getCurrentSession, signInWithPassword, signOut } from "../../services/supabase/auth";
import "./AdminsCorner.css";

export const AdminsCorner = () => {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("match-entry");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    getCurrentSession()
      .then((s) => setSession(s))
      .catch(() => setSession(null));
  }, []);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const data = await signInWithPassword({ email: authEmail.trim(), password: authPassword });
      setSession(data.session || null);
      setAuthPassword("");
    } catch (e) {
      setAuthError(e?.message || "Failed to sign in");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSession(null);
      setAuthError("");
    } catch (e) {
      setAuthError(e?.message || "Failed to sign out");
    }
  };

  if (!session) {
    const canSubmit = !authLoading && authEmail.trim() && authPassword;

    return (
      <div className="attendance admins-corner">
        <div className="attendance-no-data admin-auth-shell">
          <div className="admin-auth-card">
            <h3>Admins Corner</h3>
            <p>Sign in to access admin tools.</p>
          {authError ? <div className="error-message">{authError}</div> : null}
            <div className="admin-auth-form">
              <div className="form-group admin-auth-field">
                <label htmlFor="admin-auth-email">Email</label>
                <input
                  id="admin-auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="form-group admin-auth-field">
                <label htmlFor="admin-auth-password">Password</label>
                <input
                  id="admin-auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) {
                      handleSignIn();
                    }
                  }}
                />
              </div>
              <button className="btn btn-primary admin-auth-submit" onClick={handleSignIn} disabled={!canSubmit}>
                {authLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </div>
          <div className="admin-auth-help">
            Use your Supabase admin account credentials.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance">
      <div className="sub-tab-nav">
        <div className="stats-view-tabs">
          <button
            className={`stats-view-tab ${activeTab === "match-entry" ? "active" : ""}`}
            onClick={() => setActiveTab("match-entry")}
          >
            📝 Match Entry
          </button>
          <button
            className={`stats-view-tab ${activeTab === "add-player" ? "active" : ""}`}
            onClick={() => setActiveTab("add-player")}
          >
            ➕ Add Player
          </button>
        </div>
        <div className="attendance-year-selector">
          <label>{session.user?.email}</label>
          <button className="btn btn-secondary" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {authError ? <div className="error-message">{authError}</div> : null}
      {activeTab === "match-entry" ? (
        <MatchEntry />
      ) : (
        <div className="attendance-no-data">
          <p>Add Player is coming soon.</p>
        </div>
      )}
    </div>
  );
};

