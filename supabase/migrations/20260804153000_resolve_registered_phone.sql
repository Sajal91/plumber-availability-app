create or replace function public.resolve_registered_phone(phone text)
returns table (profile_id uuid, phone_number text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.phone_number
  from public.profiles p
  where right(regexp_replace(p.phone_number, '\D', '', 'g'), 10)
      = right(regexp_replace(phone, '\D', '', 'g'), 10)
    and length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) >= 10
  limit 1;
$$;

revoke all on function public.resolve_registered_phone(text) from public;
revoke all on function public.resolve_registered_phone(text) from anon, authenticated;
grant execute on function public.resolve_registered_phone(text) to service_role;
