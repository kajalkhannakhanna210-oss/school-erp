-- A blank academic-year format means the academic-year segment is omitted.
create or replace function public.format_wing_academic_year(p_session_id uuid, p_format text)
returns text language plpgsql stable as $$
declare n text; y1 text; y2 text;
begin
  if nullif(trim(p_format), '') is null then return ''; end if;
  select name into n from public.academic_sessions where id = p_session_id;
  if n is null then return ''; end if;
  y1 := substring(n from '(20[0-9]{2})');
  if y1 is null then return n; end if;
  y2 := right((y1::integer + 1)::text, 2);
  return replace(replace(p_format, 'YYYY', y1), 'YY', y2);
end $$;
