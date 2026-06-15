create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_name text not null unique,
  initials text not null,
  active_build_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  account_name text not null unique,
  initials text not null,
  token_hash text not null unique,
  status text not null default 'open'
    check (status in ('open', 'claimed', 'revoked')),
  expires_at timestamptz null,
  claimed_by uuid null references auth.users(id) on delete set null,
  claimed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.builds (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  character_name text not null,
  build_name text not null,
  ascendancy_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_active_build_id_fkey
  foreign key (active_build_id) references public.builds(id) on delete set null;

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  build_id uuid not null references public.builds(id) on delete cascade,
  name text not null,
  base_type text not null,
  kind text not null
    check (kind in ('unique', 'currency', 'gem', 'support', 'tablet', 'rare')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  added_order integer not null default 0,
  quantity integer null check (quantity is null or quantity > 0),
  source_url text null,
  icon text null,
  note text null,
  requirements text[] not null default '{}',
  properties jsonb not null default '[]'::jsonb,
  meta_lines text[] not null default '{}',
  description_lines text[] not null default '{}',
  explicit_mods text[] not null default '{}',
  desired_mods text[] not null default '{}',
  must_have_affixes text[] not null default '{}',
  nice_affixes text[] not null default '{}',
  flavour_lines text[] not null default '{}',
  footer_line text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wish_claims (
  wish_id uuid not null references public.wishes(id) on delete cascade,
  claimer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wish_id, claimer_id)
);

create index builds_profile_id_idx on public.builds(profile_id);
create index wishes_owner_id_idx on public.wishes(owner_id);
create index wishes_build_id_idx on public.wishes(build_id);
create index wish_claims_claimer_id_idx on public.wish_claims(claimer_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger invites_set_updated_at
before update on public.invites
for each row execute function public.set_updated_at();

create trigger builds_set_updated_at
before update on public.builds
for each row execute function public.set_updated_at();

create trigger wishes_set_updated_at
before update on public.wishes
for each row execute function public.set_updated_at();

grant select on table public.profiles to authenticated;
grant update (initials, active_build_id) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.builds to authenticated;
grant select, insert, update, delete on table public.wishes to authenticated;
grant select, insert, delete on table public.wish_claims to authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.invites to service_role;
grant select, insert, update, delete on table public.builds to service_role;
grant select, insert, update, delete on table public.wishes to service_role;
grant select, insert, update, delete on table public.wish_claims to service_role;

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.builds enable row level security;
alter table public.wishes enable row level security;
alter table public.wish_claims enable row level security;

create policy "team can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and (
    active_build_id is null
    or exists (
      select 1
      from public.builds
      where builds.id = profiles.active_build_id
        and builds.profile_id = (select auth.uid())
    )
  )
);

create policy "team can read builds"
on public.builds
for select
to authenticated
using (true);

create policy "users can insert own builds"
on public.builds
for insert
to authenticated
with check ((select auth.uid()) = profile_id);

create policy "users can update own builds"
on public.builds
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "users can delete own builds"
on public.builds
for delete
to authenticated
using ((select auth.uid()) = profile_id);

create policy "team can read wishes"
on public.wishes
for select
to authenticated
using (true);

create policy "users can insert own wishes"
on public.wishes
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.builds
    where builds.id = wishes.build_id
      and builds.profile_id = (select auth.uid())
  )
);

create policy "users can update own wishes"
on public.wishes
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.builds
    where builds.id = wishes.build_id
      and builds.profile_id = (select auth.uid())
  )
);

create policy "users can delete own wishes"
on public.wishes
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy "team can read claims"
on public.wish_claims
for select
to authenticated
using (true);

create policy "users can claim other users wishes"
on public.wish_claims
for insert
to authenticated
with check (
  (select auth.uid()) = claimer_id
  and exists (
    select 1
    from public.wishes
    where wishes.id = wish_claims.wish_id
      and wishes.owner_id <> (select auth.uid())
  )
);

create policy "users can delete own claims"
on public.wish_claims
for delete
to authenticated
using ((select auth.uid()) = claimer_id);
