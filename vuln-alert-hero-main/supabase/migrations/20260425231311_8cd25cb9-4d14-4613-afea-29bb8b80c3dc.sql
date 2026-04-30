-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- CVE cache
create table public.cves (
  cve_id text primary key,
  description text,
  cvss_score numeric,
  cvss_vector text,
  severity text,
  risk_score numeric,
  risk_level text,
  published_at timestamptz,
  last_modified_at timestamptz,
  is_kev boolean not null default false,
  has_exploit boolean not null default false,
  affected_products jsonb default '[]'::jsonb,
  references_data jsonb default '[]'::jsonb,
  raw jsonb,
  ai_summary text,
  fetched_at timestamptz not null default now()
);
alter table public.cves enable row level security;
create policy "anyone authed can read cves" on public.cves for select to authenticated using (true);
create policy "service can manage cves" on public.cves for all to service_role using (true) with check (true);

create index cves_published_idx on public.cves (published_at desc);
create index cves_severity_idx on public.cves (severity);
create index cves_kev_idx on public.cves (is_kev) where is_kev = true;

-- KEV
create table public.kev_entries (
  cve_id text primary key,
  vendor_project text,
  product text,
  vulnerability_name text,
  date_added date,
  short_description text,
  required_action text,
  due_date date,
  ransomware_use text,
  fetched_at timestamptz not null default now()
);
alter table public.kev_entries enable row level security;
create policy "anyone authed can read kev" on public.kev_entries for select to authenticated using (true);
create policy "service can manage kev" on public.kev_entries for all to service_role using (true) with check (true);

-- Watchlist
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ecosystem text not null,
  package_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ecosystem, package_name)
);
alter table public.watchlist enable row level security;
create policy "user reads own watchlist" on public.watchlist for select to authenticated using (auth.uid() = user_id);
create policy "user inserts own watchlist" on public.watchlist for insert to authenticated with check (auth.uid() = user_id);
create policy "user deletes own watchlist" on public.watchlist for delete to authenticated using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.cves;