create extension if not exists "pgcrypto";

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id bigserial primary key,
  player_name text unique not null,
  group_availability text,
  is_tracked boolean not null default true,
  position text[] not null default '{MID}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_tracker_seasons (
  season_year int primary key,
  total_goals int not null default 0,
  weekend_goals int not null default 0,
  weekday_goals int not null default 0,
  all_players text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_tracker_matches (
  id text primary key,
  season_year int not null references public.weekly_tracker_seasons(season_year) on delete cascade,
  match_date date not null,
  date text not null,
  day text not null,
  match_played boolean not null default false,
  match_cancelled boolean not null default false,
  is_tournament boolean not null default false,
  is_full_house boolean not null default false,
  is_backfilled boolean not null default false,
  team1_rotating_goalie boolean not null default false,
  team2_rotating_goalie boolean not null default false,
  attendance jsonb not null default '{}'::jsonb,
  scoreline jsonb not null default '{}'::jsonb,
  total_goals int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_tracker_matches_season_idx
  on public.weekly_tracker_matches(season_year, match_date);

create table if not exists public.attendance_leaderboard_summary (
  season_year int primary key,
  total_games int not null default 0,
  midweek_games int not null default 0,
  weekend_games int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_leaderboard_players (
  season_year int not null,
  category text not null,
  sno int not null,
  player_name text not null,
  midweek_games int not null default 0,
  weekend_games int not null default 0,
  total_games int not null default 0,
  games_2024 int null,
  difference int null,
  notes text null,
  updated_at timestamptz not null default now(),
  primary key (season_year, player_name)
);

create index if not exists attendance_leaderboard_players_season_sno_idx
  on public.attendance_leaderboard_players(season_year, sno);

create table if not exists public.stats_leaderboard_players (
  season_year int not null,
  id int not null,
  player_name text not null,
  position text[] not null default '{MID}',
  matches int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  clean_sheets int not null default 0,
  goals int not null default 0,
  hat_tricks int not null default 0,
  own_goals int not null default 0,
  weekend_matches int not null default 0,
  weekend_wins int not null default 0,
  weekend_losses int not null default 0,
  weekend_draws int not null default 0,
  weekend_clean_sheets int not null default 0,
  weekend_goals int not null default 0,
  weekend_hat_tricks int not null default 0,
  weekend_own_goals int not null default 0,
  weekday_matches int not null default 0,
  weekday_wins int not null default 0,
  weekday_losses int not null default 0,
  weekday_draws int not null default 0,
  weekday_clean_sheets int not null default 0,
  weekday_goals int not null default 0,
  weekday_hat_tricks int not null default 0,
  weekday_own_goals int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (season_year, id),
  unique (season_year, player_name)
);

create or replace function public.parse_match_id_to_date(match_id text)
returns date
language sql
immutable
as $$
  select to_date(match_id, 'DD-MM-YYYY');
$$;

create or replace function public.upsert_match_entry(in_season_year int, in_match_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  payload_id text;
begin
  payload_id := in_match_payload->>'id';
  if payload_id is null then
    raise exception 'Match payload id is required';
  end if;

  insert into public.weekly_tracker_seasons(season_year)
  values (in_season_year)
  on conflict (season_year) do nothing;

  insert into public.weekly_tracker_matches(
    id, season_year, match_date, date, day, match_played, match_cancelled, is_tournament,
    is_full_house, is_backfilled, team1_rotating_goalie, team2_rotating_goalie, attendance,
    scoreline, total_goals, updated_at
  )
  values (
    payload_id,
    in_season_year,
    public.parse_match_id_to_date(payload_id),
    coalesce(in_match_payload->>'date',''),
    coalesce(in_match_payload->>'day','Midweek'),
    coalesce((in_match_payload->>'matchPlayed')::boolean, false),
    coalesce((in_match_payload->>'matchCancelled')::boolean, false),
    coalesce((in_match_payload->>'isTournament')::boolean, false),
    coalesce((in_match_payload->>'isFullHouse')::boolean, false),
    coalesce((in_match_payload->>'isBackfilled')::boolean, false),
    coalesce((in_match_payload->>'team1RotatingGoalie')::boolean, false),
    coalesce((in_match_payload->>'team2RotatingGoalie')::boolean, false),
    coalesce(in_match_payload->'attendance', '{}'::jsonb),
    coalesce(in_match_payload->'scoreline', '{}'::jsonb),
    coalesce((in_match_payload->>'totalGoals')::int, 0),
    now()
  )
  on conflict (id) do update
    set season_year = excluded.season_year,
        match_date = excluded.match_date,
        date = excluded.date,
        day = excluded.day,
        match_played = excluded.match_played,
        match_cancelled = excluded.match_cancelled,
        is_tournament = excluded.is_tournament,
        is_full_house = excluded.is_full_house,
        is_backfilled = excluded.is_backfilled,
        team1_rotating_goalie = excluded.team1_rotating_goalie,
        team2_rotating_goalie = excluded.team2_rotating_goalie,
        attendance = excluded.attendance,
        scoreline = excluded.scoreline,
        total_goals = excluded.total_goals,
        updated_at = now();

  return jsonb_build_object('ok', true, 'matchId', payload_id, 'seasonYear', in_season_year);
end;
$$;

create or replace function public.refresh_season_stats(in_season_year int)
returns jsonb
language plpgsql
security definer
as $$
declare
  season_total int;
  season_weekend int;
  season_weekday int;
  all_players_arr text[];
  summary_total_games int;
  summary_midweek_games int;
  summary_weekend_games int;
begin
  select
    coalesce(sum(total_goals), 0),
    coalesce(sum(case when lower(day) = 'weekend' then total_goals else 0 end), 0),
    coalesce(sum(case when lower(day) = 'midweek' then total_goals else 0 end), 0)
  into season_total, season_weekend, season_weekday
  from public.weekly_tracker_matches
  where season_year = in_season_year and match_played = true and match_cancelled = false and is_tournament = false;

  select coalesce(array_agg(distinct p_name order by p_name), '{}') into all_players_arr
  from (
    select trim(j.val::text, '"') as p_name
    from public.weekly_tracker_matches m
    cross join lateral jsonb_path_query(m.attendance, '$.*[*].name') as j(val)
    where m.season_year = in_season_year
  ) t
  where p_name is not null and p_name <> '';

  insert into public.weekly_tracker_seasons(season_year, total_goals, weekend_goals, weekday_goals, all_players, updated_at)
  values (in_season_year, season_total, season_weekend, season_weekday, all_players_arr, now())
  on conflict (season_year) do update
    set total_goals = excluded.total_goals,
        weekend_goals = excluded.weekend_goals,
        weekday_goals = excluded.weekday_goals,
        all_players = excluded.all_players,
        updated_at = now();

  -- Backfill seasons are imported as fixed snapshots: skip recomputation.
  if in_season_year < 2026 then
    return jsonb_build_object(
      'ok', true,
      'seasonYear', in_season_year,
      'totalGoals', season_total,
      'weekendGoals', season_weekend,
      'weekdayGoals', season_weekday,
      'recomputedLeaderboards', false
    );
  end if;

  create temp table tmp_old_attendance_players on commit drop as
    select * from public.attendance_leaderboard_players where season_year = in_season_year;

  create temp table tmp_old_stats_players on commit drop as
    select * from public.stats_leaderboard_players where season_year = in_season_year;

  create temp table tmp_played_matches on commit drop as
    select *
    from public.weekly_tracker_matches
    where season_year = in_season_year
      and match_played = true
      and match_cancelled = false
      and is_tournament = false;

  create temp table tmp_appearances on commit drop as
    select
      trim(p.value->>'name') as player_name,
      lower(pm.day) as day_bucket,
      t.key as team_name,
      coalesce((p.value->>'goals')::int, 0) as goals,
      coalesce((p.value->>'ownGoals')::int, 0) as own_goals,
      coalesce((p.value->>'cleanSheet')::boolean, false) as clean_sheet,
      coalesce((pm.scoreline->>t.key)::int, 0) as team_score,
      coalesce((
        select (s.value)::int
        from jsonb_each_text(pm.scoreline) s
        where s.key <> t.key
        limit 1
      ), 0) as opponent_score
    from tmp_played_matches pm
    cross join lateral jsonb_each(pm.attendance) t
    cross join lateral jsonb_array_elements(t.value) p
    where trim(coalesce(p.value->>'name', '')) <> '';

  select
    count(*),
    count(*) filter (where lower(day) = 'midweek'),
    count(*) filter (where lower(day) = 'weekend')
  into summary_total_games, summary_midweek_games, summary_weekend_games
  from tmp_played_matches;

  insert into public.attendance_leaderboard_summary(
    season_year, total_games, midweek_games, weekend_games, updated_at
  )
  values (
    in_season_year, summary_total_games, summary_midweek_games, summary_weekend_games, now()
  )
  on conflict (season_year) do update
    set total_games = excluded.total_games,
        midweek_games = excluded.midweek_games,
        weekend_games = excluded.weekend_games,
        updated_at = now();

  delete from public.attendance_leaderboard_players where season_year = in_season_year;

  insert into public.attendance_leaderboard_players (
    season_year,
    category,
    sno,
    player_name,
    midweek_games,
    weekend_games,
    total_games,
    games_2024,
    difference,
    notes,
    updated_at
  )
  with attendance_agg as (
    select
      player_name,
      count(*)::int as total_games,
      count(*) filter (where day_bucket = 'midweek')::int as midweek_games,
      count(*) filter (where day_bucket = 'weekend')::int as weekend_games
    from tmp_appearances
    group by player_name
  ),
  enriched as (
    select
      a.player_name,
      case
        when lower(a.player_name) = 'others' then 'Others'
        when upper(coalesce(p.group_availability, '')) = 'ALLGAMES' then 'ALLGAMES'
        when upper(coalesce(p.group_availability, '')) = 'WEEKEND' then 'WEEKEND'
        when upper(coalesce(p.group_availability, '')) = 'MIDWEEK' then 'MIDWEEK'
        else 'Others'
      end as category,
      a.midweek_games,
      a.weekend_games,
      a.total_games,
      o.games_2024,
      o.notes
    from attendance_agg a
    left join public.players p
      on lower(p.player_name) = lower(a.player_name)
    left join tmp_old_attendance_players o
      on lower(o.player_name) = lower(a.player_name)
  )
  select
    in_season_year,
    e.category,
    row_number() over (
      partition by e.category
      order by e.total_games desc, e.player_name asc
    )::int as sno,
    e.player_name,
    e.midweek_games,
    e.weekend_games,
    e.total_games,
    e.games_2024,
    case
      when e.games_2024 is null then null
      else e.total_games - e.games_2024
    end as difference,
    e.notes,
    now()
  from enriched e;

  delete from public.stats_leaderboard_players where season_year = in_season_year;

  insert into public.stats_leaderboard_players (
    season_year,
    id,
    player_name,
    position,
    matches,
    wins,
    losses,
    draws,
    clean_sheets,
    goals,
    hat_tricks,
    own_goals,
    weekend_matches,
    weekend_wins,
    weekend_losses,
    weekend_draws,
    weekend_clean_sheets,
    weekend_goals,
    weekend_hat_tricks,
    weekend_own_goals,
    weekday_matches,
    weekday_wins,
    weekday_losses,
    weekday_draws,
    weekday_clean_sheets,
    weekday_goals,
    weekday_hat_tricks,
    weekday_own_goals,
    updated_at
  )
  with stats_agg as (
    select
      a.player_name,
      count(*)::int as matches,
      count(*) filter (where a.team_score > a.opponent_score)::int as wins,
      count(*) filter (where a.team_score < a.opponent_score)::int as losses,
      count(*) filter (where a.team_score = a.opponent_score)::int as draws,
      sum(a.goals)::int as goals,
      count(*) filter (where a.goals >= 3)::int as hat_tricks,
      sum(a.own_goals)::int as own_goals,
      count(*) filter (where a.clean_sheet)::int as clean_sheets,
      count(*) filter (where a.day_bucket = 'weekend')::int as weekend_matches,
      count(*) filter (where a.day_bucket = 'weekend' and a.team_score > a.opponent_score)::int as weekend_wins,
      count(*) filter (where a.day_bucket = 'weekend' and a.team_score < a.opponent_score)::int as weekend_losses,
      count(*) filter (where a.day_bucket = 'weekend' and a.team_score = a.opponent_score)::int as weekend_draws,
      count(*) filter (where a.day_bucket = 'weekend' and a.clean_sheet)::int as weekend_clean_sheets,
      sum(case when a.day_bucket = 'weekend' then a.goals else 0 end)::int as weekend_goals,
      count(*) filter (where a.day_bucket = 'weekend' and a.goals >= 3)::int as weekend_hat_tricks,
      sum(case when a.day_bucket = 'weekend' then a.own_goals else 0 end)::int as weekend_own_goals,
      count(*) filter (where a.day_bucket = 'midweek')::int as weekday_matches,
      count(*) filter (where a.day_bucket = 'midweek' and a.team_score > a.opponent_score)::int as weekday_wins,
      count(*) filter (where a.day_bucket = 'midweek' and a.team_score < a.opponent_score)::int as weekday_losses,
      count(*) filter (where a.day_bucket = 'midweek' and a.team_score = a.opponent_score)::int as weekday_draws,
      count(*) filter (where a.day_bucket = 'midweek' and a.clean_sheet)::int as weekday_clean_sheets,
      sum(case when a.day_bucket = 'midweek' then a.goals else 0 end)::int as weekday_goals,
      count(*) filter (where a.day_bucket = 'midweek' and a.goals >= 3)::int as weekday_hat_tricks,
      sum(case when a.day_bucket = 'midweek' then a.own_goals else 0 end)::int as weekday_own_goals
    from tmp_appearances a
    group by a.player_name
  )
  select
    in_season_year,
    coalesce(os.id, row_number() over (order by s.player_name))::int as id,
    s.player_name,
    coalesce(p.position, array['MID']::text[]) as position,
    s.matches,
    s.wins,
    s.losses,
    s.draws,
    s.clean_sheets,
    s.goals,
    s.hat_tricks,
    s.own_goals,
    s.weekend_matches,
    s.weekend_wins,
    s.weekend_losses,
    s.weekend_draws,
    s.weekend_clean_sheets,
    s.weekend_goals,
    s.weekend_hat_tricks,
    s.weekend_own_goals,
    s.weekday_matches,
    s.weekday_wins,
    s.weekday_losses,
    s.weekday_draws,
    s.weekday_clean_sheets,
    s.weekday_goals,
    s.weekday_hat_tricks,
    s.weekday_own_goals,
    now()
  from stats_agg s
  left join public.players p
    on lower(p.player_name) = lower(s.player_name)
  left join tmp_old_stats_players os
    on lower(os.player_name) = lower(s.player_name);

  return jsonb_build_object(
    'ok', true,
    'seasonYear', in_season_year,
    'totalGoals', season_total,
    'weekendGoals', season_weekend,
    'weekdayGoals', season_weekday,
    'recomputedLeaderboards', true
  );
end;
$$;

