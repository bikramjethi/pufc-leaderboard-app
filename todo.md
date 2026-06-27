# TODO

## High Priority

- Implement admin fallback flow: **Export Supabase data back to repo JSON by year**.
- Add admin UI action in Match Entry/Admin area:
  - Year input/select (`2024`, `2025`, `2026`, future years)
  - Button: `Update File Entry` (or `Export to Repo`)
- Implement secure server-side export endpoint (not frontend-only file writes):
  - Read season data from Supabase
  - Generate JSON payloads matching current repo file shapes
  - Commit changes to GitHub (or open PR) from server-side integration

## Year Rules (as agreed)

- For `2024` and `2025`:
  - Do **not** recompute attendance/stats from weekly matches
  - Export/update only `src/data/attendance-data/{year}.json` unless explicitly requested otherwise
- For `2026+`:
  - Keep full recomputation behavior for leaderboards
  - Export/update:
    - `src/data/attendance-data/{year}.json`
    - `src/data/attendance-data/leaderboard/{year}.json`
    - `src/data/leaderboard-data/{year}.json`

## Safety / Operations

- Prefer PR-based export commits (safer than direct push).
- Add audit fields/logging for admin export actions (who, when, year, result).
- Add one-click parity check view for DB vs repo JSON counts before export commit.
- Document rollback: disable Supabase read flags and fall back to JSON if needed.

## Optional Hardening

- Add admin role-management UI (instead of manual SQL for `user_roles`).
- Enforce stronger auth policy (password rules + email verification, optional MFA).
