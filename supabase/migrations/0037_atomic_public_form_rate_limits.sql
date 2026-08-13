create or replace function public.check_rate_limit(
  p_key text,
  p_action text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.auth_rate_limits%rowtype;
  next_attempts integer;
  next_window_started_at timestamptz;
  next_window_ends_at timestamptz;
  next_blocked_until timestamptz;
  now_at timestamptz := now();
begin
  insert into public.auth_rate_limits (
    key,
    action,
    attempts,
    window_started_at,
    window_ends_at,
    blocked_until,
    updated_at
  )
  values (
    p_key,
    p_action,
    0,
    now_at,
    now_at + make_interval(secs => p_window_seconds),
    null,
    now_at
  )
  on conflict (key) do nothing;

  select *
    into current_row
    from public.auth_rate_limits
    where key = p_key
    for update;

  if current_row.blocked_until is not null and current_row.blocked_until > now_at then
    return query select false, ceil(extract(epoch from current_row.blocked_until - now_at))::integer;
    return;
  end if;

  if current_row.window_ends_at <= now_at then
    next_attempts := 1;
    next_window_started_at := now_at;
    next_window_ends_at := now_at + make_interval(secs => p_window_seconds);
  else
    next_attempts := current_row.attempts + 1;
    next_window_started_at := current_row.window_started_at;
    next_window_ends_at := current_row.window_ends_at;
  end if;

  if next_attempts > p_limit then
    next_blocked_until := now_at + make_interval(secs => p_block_seconds);
  else
    next_blocked_until := null;
  end if;

  update public.auth_rate_limits
    set action = p_action,
        attempts = next_attempts,
        window_started_at = next_window_started_at,
        window_ends_at = next_window_ends_at,
        blocked_until = next_blocked_until,
        updated_at = now_at
    where key = p_key;

  if next_blocked_until is not null then
    return query select false, p_block_seconds;
  else
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer, integer) to service_role;
