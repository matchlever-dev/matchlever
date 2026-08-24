-- Editable homepage / brand marketing copy (singleton row)

create table public.site_copy (
  id smallint primary key default 1 check (id = 1),
  hero_taglines text[] not null,
  brand_tagline text not null,
  updated_at timestamptz not null default now(),
  constraint site_copy_hero_taglines_length
    check (cardinality(hero_taglines) = 3),
  constraint site_copy_hero_taglines_nonempty
    check (
      char_length(trim(hero_taglines[1])) between 1 and 120
      and char_length(trim(hero_taglines[2])) between 1 and 120
      and char_length(trim(hero_taglines[3])) between 1 and 120
    ),
  constraint site_copy_brand_tagline_length
    check (char_length(trim(brand_tagline)) between 1 and 200)
);

comment on table public.site_copy is
  'Singleton marketing copy: homepage hero carousel + brand tagline.';
comment on column public.site_copy.hero_taglines is
  'Exactly three rotating homepage hero taglines.';
comment on column public.site_copy.brand_tagline is
  'Site-wide brand tagline shown in the footer and brand lockups.';

drop trigger if exists site_copy_set_updated_at on public.site_copy;
create trigger site_copy_set_updated_at
  before update on public.site_copy
  for each row execute function public.set_updated_at();

insert into public.site_copy (id, hero_taglines, brand_tagline)
values (
  1,
  array[
    'Upload your profile, find your match',
    'Where Tech Talent Meets Tech Innovators',
    'Your Lever into the Tech Industry'
  ],
  'No names. No bias. Just the right match.'
)
on conflict (id) do nothing;

alter table public.site_copy enable row level security;

-- Homepage and footers need to read this without auth.
create policy "Anyone can read site copy"
  on public.site_copy
  for select
  to anon, authenticated
  using (true);

create policy "Admins can update site copy"
  on public.site_copy
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can insert site copy"
  on public.site_copy
  for insert
  to authenticated
  with check (public.is_admin());
