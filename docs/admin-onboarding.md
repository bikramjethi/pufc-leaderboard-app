# Admin Onboarding

This guide is for admins/editors who need to update match data through the website.

## 1) Access checklist

- You have the website URL.
- You have an admin/editor email and password (Supabase Auth user).
- Your account has a role in `public.user_roles`:
  - `admin` (full admin access)
  - `editor` (match/data update access)

## 2) Sign in and update match data

1. Open the app and go to `Match Entry`.
2. Sign in with your assigned email/password.
3. Fill match details (year, match id, teams, score, players, goals).
4. Click `Save Match`.

## 3) What updates automatically

- `2026+` seasons:
  - Weekly tracker data updates.
  - Attendance/stats leaderboards are recomputed automatically.
- `2024/2025` (backfill years):
  - Weekly tracker rows can be stored.
  - Attendance/stats recomputation is intentionally skipped.

## 4) Troubleshooting

- **Cannot sign in**
  - Ask admin to confirm your Supabase Auth account exists.
  - Ask admin to confirm your role in `public.user_roles`.
- **Save fails**
  - Check internet connectivity.
  - Retry once.
  - Share error message with admin/developer.
- **Data seems stale**
  - Refresh the page.
  - Confirm you edited the correct season/year.

## 5) Admin role assignment (for project owner)

Create/assign role via SQL:

```sql
insert into public.user_roles (user_id, role)
values ('<auth_user_uuid>', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

