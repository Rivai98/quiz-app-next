-- Run after supabase-schema.sql; safe to rerun on existing databases.
begin;
create index if not exists idx_attempts_report_history
  on public.attempts (quiz_id, normalized_name, submitted_at, id);

create or replace function public.admin_attempt_report(
  p_quiz_id uuid, p_search text default '', p_student text default null,
  p_page integer default 1, p_page_size integer default 20
) returns jsonb language sql stable security invoker set search_path = '' as $$
with numbered as (
  select id, student_name, score, elapsed_seconds, submitted_at,
    lower(translate(regexp_replace(trim(student_name), '\s+', ' ', 'g'), 'أإآىة', 'ااايه')) as name,
    row_number() over (
      partition by lower(translate(regexp_replace(trim(student_name), '\s+', ' ', 'g'), 'أإآىة', 'ااايه'))
      order by submitted_at, id
    ) as number
  from public.attempts where quiz_id = p_quiz_id
), entries as (
  select *, jsonb_build_object('id', id, 'score', score, 'elapsedSeconds', elapsed_seconds,
    'submittedAt', submitted_at, 'attemptNumber', number) as entry from numbered
), grouped as (
  select name, count(*) as count,
    (array_agg(student_name order by number desc))[1] as student_name,
    (array_agg(entry order by number))[1] as first,
    (array_agg(entry order by number desc))[1] as latest,
    (array_agg(entry order by score desc, elapsed_seconds, number))[1] as best
  from entries where strpos(name, coalesce(p_search, '')) > 0 group by name
), student_page as (
  select jsonb_build_object('normalizedName', name, 'studentName', student_name,
    'count', count, 'first', first, 'latest', latest, 'best', best) as student
  from grouped order by name collate "C"
  limit greatest(1, least(p_page_size, 50)) offset (greatest(1, p_page) - 1)::bigint * greatest(1, least(p_page_size, 50))
), history_page as (
  select entry from entries where name = p_student order by number
  limit greatest(1, least(p_page_size, 50)) offset (greatest(1, p_page) - 1)::bigint * greatest(1, least(p_page_size, 50))
)
select case when p_student is null then jsonb_build_object(
  'students', coalesce((select jsonb_agg(student) from student_page), '[]'::jsonb),
  'total', (select count(*) from grouped), 'page', p_page, 'pageSize', p_page_size
) else jsonb_build_object(
  'attempts', coalesce((select jsonb_agg(entry) from history_page), '[]'::jsonb),
  'total', (select count(*) from entries where name = p_student), 'page', p_page, 'pageSize', p_page_size
) end;
$$;
revoke execute on function public.admin_attempt_report(uuid,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_attempt_report(uuid,text,text,integer,integer) to service_role;
commit;
