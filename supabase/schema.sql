create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  played_on date not null default current_date,
  status text not null default 'open' check(status in ('open','finished')),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  name text not null,
  color text not null default '#2563eb'
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid not null references public.players(id) on delete cascade,
  role text not null default 'field' check(role in ('field','goalkeeper')),
  goals integer not null default 0,
  assists integer not null default 0,
  goals_conceded integer not null default 0,
  entered_at timestamptz not null default now(),
  left_at timestamptz
);

create table if not exists public.player_attendance (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  present boolean not null default true,
  unique(match_id,player_id)
);

create index if not exists idx_players_group on public.players(group_id);
create index if not exists idx_matches_group_date on public.matches(group_id,played_on);
create index if not exists idx_match_players_match on public.match_players(match_id);

create or replace view public.player_overalls as
select
  p.id, p.group_id, p.name, p.photo_url,
  coalesce(sum(mp.goals),0)::int as goals,
  coalesce(sum(mp.assists),0)::int as assists,
  coalesce(sum(case when mp.role='goalkeeper' then mp.goals_conceded else 0 end),0)::int as conceded,
  count(distinct case when pa.present then pa.match_id end)::int as attendance,
  greatest(1, least(99, round(
    50
    + coalesce(sum(mp.goals),0) * 2
    + coalesce(sum(mp.assists),0) * 1.25
    + count(distinct case when pa.present then pa.match_id end) * 0.75
    - coalesce(sum(case when mp.role='goalkeeper' then mp.goals_conceded else 0 end),0) * 0.7
  )))::int as overall
from public.players p
left join public.match_players mp on mp.player_id=p.id
left join public.player_attendance pa on pa.player_id=p.id
group by p.id,p.group_id,p.name,p.photo_url;

alter table public.groups enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.teams enable row level security;
alter table public.match_players enable row level security;
alter table public.player_attendance enable row level security;

create or replace function public.is_group_owner(gid uuid)
returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.groups where id=gid and owner_id=auth.uid());
$$;

drop policy if exists "group owner all" on public.groups;
create policy "group owner all" on public.groups for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());

drop policy if exists "players owner all" on public.players;
create policy "players owner all" on public.players for all using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));

drop policy if exists "matches owner all" on public.matches;
create policy "matches owner all" on public.matches for all using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));

drop policy if exists "teams owner all" on public.teams;
create policy "teams owner all" on public.teams for all using (
  exists(select 1 from public.matches m where m.id=match_id and public.is_group_owner(m.group_id))
) with check (
  exists(select 1 from public.matches m where m.id=match_id and public.is_group_owner(m.group_id))
);

drop policy if exists "match players owner all" on public.match_players;
create policy "match players owner all" on public.match_players for all using (
  exists(select 1 from public.matches m where m.id=match_id and public.is_group_owner(m.group_id))
) with check (
  exists(select 1 from public.matches m where m.id=match_id and public.is_group_owner(m.group_id))
);

drop policy if exists "attendance owner all" on public.player_attendance;
create policy "attendance owner all" on public.player_attendance for all using (
  exists(select 1 from public.matches m where m.id=match_id and public.is_group_owner(m.group_id))
) with check (
  exists(select 1 from public.matches m where m.id=match_id and public.is_group_owner(m.group_id))
);

-- Crie o bucket "player-photos" como público no Supabase Storage.
-- Para produção, prefira policies de Storage que permitam upload apenas ao organizador.
