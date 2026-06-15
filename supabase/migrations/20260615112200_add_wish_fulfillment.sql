alter table public.wishes
  add column if not exists fulfilled_by uuid null references public.profiles(id) on delete set null,
  add column if not exists fulfilled_at timestamptz null;

create index if not exists wishes_fulfilled_at_idx
  on public.wishes(fulfilled_at)
  where fulfilled_at is not null;

create index if not exists wishes_fulfilled_by_idx
  on public.wishes(fulfilled_by)
  where fulfilled_by is not null;
