-- StartupWeek Academy — Studio de création : circuit de relecture.
--
-- • Formation : nouveau statut « validee » (contenu approuvé par le relecteur, pas encore publié),
--   relecteur désigné et dates du circuit (envoi en relecture, validation).
--   Circuit : brouillon → relecture → validee → publiee (archivee à tout moment).
-- • crm.academy_comments : commentaires de relecture attachés à une formation, et le cas
--   échéant à une leçon et à un bloc ; « résolu » quand l'auteur de la formation a corrigé.
-- • Journal : l'entité courseComments rejoint crm.activities.entity.
-- RLS : section « academy » (lecture : commercial, lecture ; écriture : admin, pédagogie, formateur).

-- ───────────────────────────── Formation : statut et circuit ─────────────────────────────

alter table crm.academy_courses drop constraint if exists academy_courses_status_check;
alter table crm.academy_courses add constraint academy_courses_status_check
  check (status in ('brouillon', 'relecture', 'validee', 'publiee', 'archivee'));

alter table crm.academy_courses
  add column if not exists reviewer_id          text references crm.team_members (id) on delete set null,
  add column if not exists review_requested_at  timestamptz,
  add column if not exists validated_at         timestamptz,
  add column if not exists validated_by         text references crm.team_members (id) on delete set null;

create index if not exists academy_courses_reviewer_idx on crm.academy_courses (reviewer_id);
create index if not exists academy_courses_validated_by_idx on crm.academy_courses (validated_by);

-- ───────────────────────────── Commentaires de relecture ─────────────────────────────

create table if not exists crm.academy_comments (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  course_id    text not null references crm.academy_courses (id) on delete cascade,
  lesson_id    text references crm.academy_lessons (id) on delete cascade,
  block_id     text,                                    -- bloc de la leçon (identifiant stable dans lessons.blocks)
  author_id    text references crm.team_members (id) on delete set null,
  body         text not null check (char_length(btrim(body)) between 1 and 4000),
  resolved_at  timestamptz,
  resolved_by  text references crm.team_members (id) on delete set null,
  -- Un commentaire de bloc est toujours rattaché à sa leçon.
  constraint academy_comments_block_check check (block_id is null or lesson_id is not null)
);
create index if not exists academy_comments_course_idx on crm.academy_comments (course_id);
create index if not exists academy_comments_lesson_idx on crm.academy_comments (lesson_id);
create index if not exists academy_comments_author_idx on crm.academy_comments (author_id);
create index if not exists academy_comments_resolved_by_idx on crm.academy_comments (resolved_by);

create or replace trigger set_updated_at before update on crm.academy_comments
  for each row execute function crm.tg_set_updated_at();

alter table crm.academy_comments enable row level security;
drop policy if exists academy_comments_read on crm.academy_comments;
create policy academy_comments_read on crm.academy_comments for select to authenticated
  using ((select crm.has_access('academy', 'read')));
drop policy if exists academy_comments_insert on crm.academy_comments;
create policy academy_comments_insert on crm.academy_comments for insert to authenticated
  with check ((select crm.has_access('academy', 'write')));
drop policy if exists academy_comments_update on crm.academy_comments;
create policy academy_comments_update on crm.academy_comments for update to authenticated
  using ((select crm.has_access('academy', 'write'))) with check ((select crm.has_access('academy', 'write')));
drop policy if exists academy_comments_delete on crm.academy_comments;
create policy academy_comments_delete on crm.academy_comments for delete to authenticated
  using ((select crm.has_access('academy', 'write')));

revoke all on crm.academy_comments from public, anon;
grant select, insert, update, delete on crm.academy_comments to authenticated;
grant all on crm.academy_comments to service_role;

-- ───────────────────────────── Journal d'activité ─────────────────────────────
-- Liste complète reprise de la version en production (20260926220123_crm_academy) + courseComments.

alter table crm.activities drop constraint if exists activities_entity_check;
alter table crm.activities add constraint activities_entity_check check (entity in (
  'users', 'organizations', 'contacts', 'submissions', 'deals', 'tasks', 'sequences', 'emailTemplates', 'emails',
  'events', 'speakers', 'applications', 'projects', 'attendances', 'evaluations', 'complaints', 'indicators',
  'evidences', 'improvementActions', 'watchItems', 'quotes', 'invoices', 'payments', 'bankTransactions',
  'resources', 'contents', 'automations', 'offers',
  'courses', 'courseModules', 'lessons', 'academyPaths', 'enrollments', 'lessonProgress', 'assignments',
  'learnerConnections', 'cohorts', 'courseComments'));
