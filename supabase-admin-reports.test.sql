-- Integration regression checks. Run after migration in a TEST database only.
-- Fixtures are always rolled back. Never run against a production database.
begin;
do $$
declare
  quiz uuid := gen_random_uuid(); other_quiz uuid := gen_random_uuid(); report jsonb;
begin
  insert into public.quizzes(id,title,unit) values (quiz,'Report test','Test'),(other_quiz,'Isolation test','Test');
  insert into public.attempts(quiz_id,student_name,normalized_name,score,elapsed_seconds,submitted_at)
  select quiz, case when n % 2 = 0 then ' أحمد   على ' else 'احمد علي' end,
    'legacy-name', case n when 1 then 40 when 2 then 100 else 70 end, 30,
    '2026-10-20 10:00:00+00'::timestamptz + n * interval '1 second'
  from generate_series(1,1105) n;
  insert into public.attempts(quiz_id,student_name,normalized_name,score,elapsed_seconds)
  values(other_quiz,'احمد علي','احمد علي',100,1);
  report := public.admin_attempt_report(quiz,'احمد',null,1,20);
  assert (report->>'total')::int = 1, 'Arabic grouping or quiz isolation failed';
  assert (report#>>'{students,0,count}')::int = 1105, 'Aggregate truncated beyond 1000';
  assert (report#>>'{students,0,first,score}')::int = 40, 'First score wrong';
  assert (report#>>'{students,0,best,attemptNumber}')::int = 2, 'Best attempt number wrong';
  assert (report#>>'{students,0,latest,score}')::int = 70, 'Latest score wrong';
  report := public.admin_attempt_report(quiz,'','احمد علي',56,20);
  assert (report->>'total')::int = 1105, 'History total wrong';
  assert jsonb_array_length(report->'attempts') = 5, 'History pagination wrong';
  assert (report#>>'{attempts,0,attemptNumber}')::int = 1101, 'History numbering resets on page';
  assert position('answers' in report::text) = 0, 'Raw answers exposed';
  assert not has_function_privilege('anon','public.admin_attempt_report(uuid,text,text,integer,integer)','EXECUTE'), 'anon can access report';
  assert not has_function_privilege('authenticated','public.admin_attempt_report(uuid,text,text,integer,integer)','EXECUTE'), 'authenticated can access report';
  assert has_function_privilege('service_role','public.admin_attempt_report(uuid,text,text,integer,integer)','EXECUTE'), 'service role denied';
end;
$$;
rollback;
