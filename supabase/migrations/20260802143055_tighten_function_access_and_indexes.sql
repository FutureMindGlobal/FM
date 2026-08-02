revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.can_manage_content() from public, anon;
revoke execute on function public.can_review_results() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_manage_content() to authenticated;
grant execute on function public.can_review_results() to authenticated;

create index if not exists attempt_answers_question_idx on public.attempt_answers(question_id);
create index if not exists attempt_answers_option_idx on public.attempt_answers(selected_option_id);
create index if not exists audit_actor_idx on public.audit_logs(actor_id);
create index if not exists certificate_templates_updated_by_idx on public.certificate_templates(updated_by);
create index if not exists certificates_participant_idx on public.certificates(participant_id);
create index if not exists certificates_quiz_idx on public.certificates(quiz_id);
create index if not exists questions_focus_area_idx on public.questions(focus_area_id);
create index if not exists quizzes_created_by_idx on public.quizzes(created_by);
create index if not exists site_settings_updated_by_idx on public.site_settings(updated_by);
