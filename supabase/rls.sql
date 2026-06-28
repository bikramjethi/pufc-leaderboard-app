alter table public.user_roles enable row level security;
alter table public.players enable row level security;
alter table public.app_config enable row level security;
alter table public.weekly_tracker_seasons enable row level security;
alter table public.weekly_tracker_matches enable row level security;
alter table public.attendance_leaderboard_summary enable row level security;
alter table public.attendance_leaderboard_players enable row level security;
alter table public.stats_leaderboard_players enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

drop policy if exists "public read players" on public.players;
create policy "public read players"
  on public.players for select
  to authenticated, anon
  using (true);

drop policy if exists "public read app config" on public.app_config;
create policy "public read app config"
  on public.app_config for select
  to authenticated, anon
  using (true);

drop policy if exists "public read weekly seasons" on public.weekly_tracker_seasons;
create policy "public read weekly seasons"
  on public.weekly_tracker_seasons for select
  to authenticated, anon
  using (true);

drop policy if exists "public read weekly matches" on public.weekly_tracker_matches;
create policy "public read weekly matches"
  on public.weekly_tracker_matches for select
  to authenticated, anon
  using (true);

drop policy if exists "public read attendance summary" on public.attendance_leaderboard_summary;
create policy "public read attendance summary"
  on public.attendance_leaderboard_summary for select
  to authenticated, anon
  using (true);

drop policy if exists "public read attendance players" on public.attendance_leaderboard_players;
create policy "public read attendance players"
  on public.attendance_leaderboard_players for select
  to authenticated, anon
  using (true);

drop policy if exists "public read stats leaderboard" on public.stats_leaderboard_players;
create policy "public read stats leaderboard"
  on public.stats_leaderboard_players for select
  to authenticated, anon
  using (true);

drop policy if exists "only admins can edit roles" on public.user_roles;
create policy "only admins can edit roles"
  on public.user_roles for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "editors can mutate weekly matches" on public.weekly_tracker_matches;
create policy "editors can mutate weekly matches"
  on public.weekly_tracker_matches for all
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

drop policy if exists "editors can mutate players" on public.players;
create policy "editors can mutate players"
  on public.players for all
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

drop policy if exists "editors can mutate app config" on public.app_config;
create policy "editors can mutate app config"
  on public.app_config for all
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

drop policy if exists "editors can mutate weekly seasons" on public.weekly_tracker_seasons;
create policy "editors can mutate weekly seasons"
  on public.weekly_tracker_seasons for all
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

drop policy if exists "editors can mutate attendance summary" on public.attendance_leaderboard_summary;
create policy "editors can mutate attendance summary"
  on public.attendance_leaderboard_summary for all
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

drop policy if exists "editors can mutate attendance players" on public.attendance_leaderboard_players;
create policy "editors can mutate attendance players"
  on public.attendance_leaderboard_players for all
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

drop policy if exists "editors can mutate stats leaderboard" on public.stats_leaderboard_players;
create policy "editors can mutate stats leaderboard"
  on public.stats_leaderboard_players for all
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

grant execute on function public.upsert_match_entry(int, jsonb) to authenticated;
grant execute on function public.refresh_season_stats(int) to authenticated;

