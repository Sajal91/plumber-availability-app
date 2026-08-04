-- Profiles for invite-only plumber/admin users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone_number text not null unique,
  role text not null default 'plumber' check (role in ('admin', 'plumber')),
  status text not null default 'offline' check (status in ('available', 'working', 'offline')),
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.set_profiles_last_updated_on_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.last_updated = now();
  end if;
  return new;
end;
$$;

create trigger profiles_status_last_updated
before update of status on public.profiles
for each row
execute function public.set_profiles_last_updated_on_status();

create or replace function public.is_phone_registered(phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.phone_number = phone
  );
$$;

revoke all on function public.is_phone_registered(text) from public;
grant execute on function public.is_phone_registered(text) to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_select_plumbers_as_admin"
on public.profiles
for select
to authenticated
using (
  public.is_admin()
  and role = 'plumber'
);

create policy "profiles_update_own_status_as_plumber"
on public.profiles
for update
to authenticated
using (auth.uid() = id and role = 'plumber')
with check (auth.uid() = id and role = 'plumber');

alter publication supabase_realtime add table public.profiles;

grant select, update on public.profiles to authenticated;

create or replace function public.prevent_profile_identity_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.name is distinct from old.name
     or new.phone_number is distinct from old.phone_number
     or new.role is distinct from old.role then
    raise exception 'Only status can be updated by clients';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_identity_changes
before update on public.profiles
for each row
execute function public.prevent_profile_identity_changes();
