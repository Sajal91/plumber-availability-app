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
    where right(regexp_replace(p.phone_number, '\D', '', 'g'), 10)
        = right(regexp_replace(phone, '\D', '', 'g'), 10)
      and length(regexp_replace(phone, '\D', '', 'g')) >= 10
  );
$$;

revoke all on function public.is_phone_registered(text) from public;
revoke all on function public.is_phone_registered(text) from anon, authenticated;
grant execute on function public.is_phone_registered(text) to service_role;
