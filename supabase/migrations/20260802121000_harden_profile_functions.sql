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

revoke execute on function public.is_phone_registered(text) from public, anon, authenticated;
grant execute on function public.is_phone_registered(text) to service_role;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
