-- ============================================================
-- 001_initial_schema.sql
-- Run this against your Supabase project via the SQL Editor
-- or `supabase db push`.
-- ============================================================

-- ── Types ──────────────────────────────────────────────────
create type content_status as enum ('draft', 'published');

-- ── Projects ───────────────────────────────────────────────
create table projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  summary     text,
  client      text,
  year        int,
  cover_path  text,
  tags        text[] default '{}',
  body_md     text,
  status      content_status default 'draft',
  sort_order  int default 0,
  published_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index on projects (status, sort_order);

-- ── Project Images ─────────────────────────────────────────
create table project_images (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects on delete cascade,
  storage_path  text not null,
  alt           text,
  caption       text,
  width         int,
  height        int,
  sort_order    int default 0
);

create index on project_images (project_id, sort_order);

-- ── Posts ──────────────────────────────────────────────────
create table posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  cover_path   text,
  body_md      text,
  tags         text[] default '{}',
  status       content_status default 'draft',
  published_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index on posts (status, published_at desc);

-- ── updated_at trigger ─────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger set_updated_at
  before update on posts
  for each row execute function update_updated_at();

-- projects already has updated_at but no trigger — add it
-- (the trigger above covers projects and posts)

-- ── RLS ────────────────────────────────────────────────────
alter table projects enable row level security;
alter table project_images enable row level security;
alter table posts enable row level security;

-- Projects: anonymous can read published
create policy "Public can read published projects"
  on projects for select
  using (status = 'published');

-- Projects: owner full access
create policy "Owner full access on projects"
  on projects for all
  using (auth.uid() = 'REPLACE: OWNER_UUID'::uuid)
  with check (auth.uid() = 'REPLACE: OWNER_UUID'::uuid);

-- Posts: anonymous can read published
create policy "Public can read published posts"
  on posts for select
  using (status = 'published');

-- Posts: owner full access
create policy "Owner full access on posts"
  on posts for all
  using (auth.uid() = 'REPLACE: OWNER_UUID'::uuid)
  with check (auth.uid() = 'REPLACE: OWNER_UUID'::uuid);

-- Project images: anonymous can read images for published projects only
create policy "Public can read published project images"
  on project_images for select
  using (
    exists (
      select 1 from projects
      where projects.id = project_images.project_id
        and projects.status = 'published'
    )
  );

-- Project images: owner full access
create policy "Owner full access on project_images"
  on project_images for all
  using (auth.uid() = 'REPLACE: OWNER_UUID'::uuid)
  with check (auth.uid() = 'REPLACE: OWNER_UUID'::uuid);

-- ── Storage ────────────────────────────────────────────────
-- Create the media bucket (public read)
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

-- Storage: anyone can read
create policy "Public read access on media"
  on storage.objects for select
  using (bucket_id = 'media');

-- Storage: owner can insert
create policy "Owner can upload to media"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.uid() = 'REPLACE: OWNER_UUID'::uuid
  );

-- Storage: owner can delete
create policy "Owner can delete from media"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and auth.uid() = 'REPLACE: OWNER_UUID'::uuid
  );
