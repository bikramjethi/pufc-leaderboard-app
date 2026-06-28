# Ops Runbook

Operational guide for maintaining the Supabase-backed PUFC workflow.

## Environment Variables

Client-side (required in local + Vercel):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server/script-side (local only unless you add server exports):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deployment Checklist

1. Confirm `.env` is not committed.
2. Confirm Vercel has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Confirm Supabase SQL is up to date:
   - `supabase/schema.sql`
   - `supabase/rls.sql`
4. Deploy and smoke test:
   - Match Entry sign-in
   - Save one 2026+ match
   - Weekly tracker + attendance + stats load as expected

## Data Rules by Year

- `< 2026`:
  - treated as backfill/static years
  - no auto attendance/stats recomputation
- `>= 2026`:
  - auto recomputation after match save is enabled

## Migration / Parity Commands

```bash
node --env-file=.env supabase-migration/migrate-json-to-supabase.js 2026
node --env-file=.env supabase-migration/verify-supabase-parity.js 2026
```

Or via npm scripts:

```bash
npm run migrate:supabase:2026
npm run verify:supabase:2026
```

## Fast Rollback Strategy

If Supabase reads fail unexpectedly:

1. In `src/leaderboard-config.js`:
   - set `SUPABASE.readModules.weeklyTracker = false`
   - set `SUPABASE.readModules.attendanceLeaderboard = false`
   - set `SUPABASE.readModules.statsLeaderboard = false`
2. Redeploy.
3. App falls back to JSON-based reads.

If write flow also needs rollback:

1. set `SUPABASE.writeEnabled = false`
2. keep `SUPABASE.enabled` as needed
3. use local legacy save flow if required

## Known Operational Commands

- Refresh season stats in Supabase:

```bash
npm run sync-stats:supabase:2026
```

- Validate function directly in SQL editor:

```sql
select public.refresh_season_stats(2026);
```

