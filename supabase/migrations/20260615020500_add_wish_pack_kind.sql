alter table public.wishes
  drop constraint if exists wishes_kind_check;

alter table public.wishes
  add constraint wishes_kind_check
  check (kind in ('unique', 'currency', 'gem', 'support', 'tablet', 'rare', 'pack'));
