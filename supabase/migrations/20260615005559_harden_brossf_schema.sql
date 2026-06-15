create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create index invites_claimed_by_idx on public.invites(claimed_by);
create index profiles_active_build_id_idx on public.profiles(active_build_id);

create policy "service role can manage invites"
on public.invites
for all
to service_role
using (true)
with check (true);
