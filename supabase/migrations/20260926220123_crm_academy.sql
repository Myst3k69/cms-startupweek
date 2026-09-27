-- ════════════════════════════════════════════════════════════════════════════
-- StartupWeek OS — 9 : StartupWeek Academy (e-learning)
--
-- Traduction 1-pour-1 de la section « StartupWeek Academy » de src/lib/domain/types.ts :
--   academy_courses      ← Course            (formations)
--   academy_modules      ← CourseModule
--   academy_lessons      ← Lesson            (blocs en jsonb : texte, vidéo, quiz, exercice, ressource, prompt, checklist)
--   academy_paths        ← AcademyPath       (parcours)
--   academy_cohorts      ← Cohort            (écoles / entreprises)
--   academy_enrollments  ← Enrollment        (accès d'un contact à une formation — unique par couple)
--   academy_progress     ← LessonProgress
--   academy_assignments  ← Assignment        (livrables)
--   academy_connections  ← LearnerConnection (relevé de connexions FOAD)
--
-- • Droits : nouvelle section « academy » (écriture : admin, pédagogie, formateur ;
--   lecture : commercial, lecture) — crm.section_access() mis à jour, copie conforme
--   de PERMISSIONS (src/lib/auth/permissions.ts).
-- • Les apprenants n'ont AUCUN accès direct : le site passe par /api/academy/learner
--   (service_role, règles d'accès appliquées côté serveur). anon : aucun droit.
-- • Journal : les entités Academy rejoignent crm.activities.entity ; audit (hors
--   session d'un membre) des statuts de formations, inscriptions et livrables.
-- • Ne touche à aucune table du schéma public.
-- ════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────── Formations ─────────────────────────────

create table if not exists crm.academy_courses (
  id                       text primary key default gen_random_uuid()::text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  title                    text not null,
  slug                     text not null,
  subtitle                 text not null default '',
  description              text not null default '',                 -- Markdown
  status                   text not null default 'brouillon' check (status in ('brouillon', 'relecture', 'publiee', 'archivee')),
  level                    text not null default 'debutant' check (level in ('debutant', 'intermediaire', 'avance')),
  personas                 text[] not null default '{}' check (personas <@ array['tech', 'non_tech', 'reconversion']),
  audience                 text not null default '',
  objectives               text[] not null default '{}',             -- Qualiopi ind. 5
  prerequisites            text not null default '',
  duration_hours           numeric(6, 1) not null default 1 check (duration_hours > 0),
  price_cents              integer not null default 0 check (price_cents >= 0),   -- TTC
  vat_rate                 numeric(5, 2) not null default 20 check (vat_rate >= 0 and vat_rate <= 100),
  in_catalog               boolean not null default false,
  access_days              integer not null default 183 check (access_days > 0),
  sequential               boolean not null default true,
  event_ids                text[] not null default '{}',             -- sessions dont les inscrits reçoivent l'accès
  cover_url                text,
  tags                     text[] not null default '{}',
  author_ids               text[] not null default '{}',
  speaker_ids              text[] not null default '{}',
  is_training              boolean not null default true,
  evaluation_methods       text not null default '',
  assistance               text not null default '',                 -- FOAD : assistance technique et pédagogique
  accessibility            text not null default '',
  passing_score            integer not null default 70 check (passing_score between 0 and 100),
  certificate_min_progress integer not null default 80 check (certificate_min_progress between 0 and 100),
  stripe_price_id          text,
  published_at             timestamptz,
  constraint academy_courses_slug_key unique (slug),
  -- Au catalogue du site : uniquement une formation publiée et payante.
  constraint academy_courses_catalog_check check (not in_catalog or (status = 'publiee' and price_cents > 0))
);
create index if not exists academy_courses_status_idx on crm.academy_courses (status);
create index if not exists academy_courses_events_idx on crm.academy_courses using gin (event_ids);

create table if not exists crm.academy_modules (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  course_id   text not null references crm.academy_courses (id) on delete cascade,
  position    integer not null default 0,
  title       text not null,
  summary     text not null default '',
  objectives  text[] not null default '{}',
  constraint academy_modules_course_key unique (id, course_id)
);
create index if not exists academy_modules_course_idx on crm.academy_modules (course_id, position);

create table if not exists crm.academy_lessons (
  id                text primary key default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  course_id         text not null references crm.academy_courses (id) on delete cascade,
  module_id         text not null,
  position          integer not null default 0,
  title             text not null,
  summary           text not null default '',
  estimated_minutes integer not null default 15 check (estimated_minutes > 0),
  is_preview        boolean not null default false,
  blocks            jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),   -- LessonBlock[]
  -- La leçon appartient à la formation de son module.
  constraint academy_lessons_module_fkey foreign key (module_id, course_id) references crm.academy_modules (id, course_id) on delete cascade
);
create index if not exists academy_lessons_module_idx on crm.academy_lessons (module_id, position);
create index if not exists academy_lessons_course_idx on crm.academy_lessons (course_id);

create table if not exists crm.academy_paths (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  title        text not null,
  slug         text not null,
  description  text not null default '',
  status       text not null default 'brouillon' check (status in ('brouillon', 'relecture', 'publiee', 'archivee')),
  personas     text[] not null default '{}' check (personas <@ array['tech', 'non_tech', 'reconversion']),
  course_ids   text[] not null default '{}',
  price_cents  integer not null default 0 check (price_cents >= 0),
  in_catalog   boolean not null default false,
  constraint academy_paths_slug_key unique (slug)
);

-- ───────────────────────────── Apprenants ─────────────────────────────

create table if not exists crm.academy_cohorts (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text not null,
  org_id       text references crm.organizations (id) on delete set null,
  event_id     text references crm.sessions (id) on delete set null,
  course_ids   text[] not null default '{}',
  contact_ids  text[] not null default '{}',
  seats        integer not null default 1 check (seats > 0),
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz not null,
  invoice_id   text references crm.invoices (id) on delete set null,
  notes        text,
  constraint academy_cohorts_dates_check check (ends_at > starts_at)
);
create index if not exists academy_cohorts_org_idx on crm.academy_cohorts (org_id);

create table if not exists crm.academy_enrollments (
  id                    text primary key default gen_random_uuid()::text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- restrict : une formation qui a des apprenants s'archive, elle ne se supprime pas.
  course_id             text not null references crm.academy_courses (id) on delete restrict,
  contact_id            text not null references crm.contacts (id) on delete cascade,
  source                text not null default 'manuel' check (source in ('session', 'achat', 'cohorte', 'manuel')),
  status                text not null default 'active' check (status in ('active', 'terminee', 'expiree', 'suspendue')),
  persona               text not null default 'non_tech' check (persona in ('tech', 'non_tech', 'reconversion')),
  event_id              text references crm.sessions (id) on delete set null,
  application_id        text references crm.applications (id) on delete set null,
  cohort_id             text references crm.academy_cohorts (id) on delete set null,
  path_id               text references crm.academy_paths (id) on delete set null,
  invoice_id            text references crm.invoices (id) on delete set null,
  granted_at            timestamptz not null default now(),
  expires_at            timestamptz not null,
  started_at            timestamptz,
  last_activity_at      timestamptz,
  completed_at          timestamptz,
  progress_percent      integer not null default 0 check (progress_percent between 0 and 100),
  time_spent_minutes    integer not null default 0 check (time_spent_minutes >= 0),
  quiz_average          integer check (quiz_average between 0 and 100),
  certificate_issued_at timestamptz,
  constraint academy_enrollments_course_contact_key unique (course_id, contact_id)
);
create index if not exists academy_enrollments_contact_idx on crm.academy_enrollments (contact_id);
create index if not exists academy_enrollments_event_idx on crm.academy_enrollments (event_id);
create index if not exists academy_enrollments_application_idx on crm.academy_enrollments (application_id);
create index if not exists academy_enrollments_cohort_idx on crm.academy_enrollments (cohort_id);
create index if not exists academy_enrollments_status_idx on crm.academy_enrollments (status, expires_at);

create table if not exists crm.academy_progress (
  id                 text primary key default gen_random_uuid()::text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  enrollment_id      text not null references crm.academy_enrollments (id) on delete cascade,
  lesson_id          text not null references crm.academy_lessons (id) on delete cascade,
  course_id          text not null references crm.academy_courses (id) on delete cascade,
  contact_id         text not null references crm.contacts (id) on delete cascade,
  status             text not null default 'en_cours' check (status in ('en_cours', 'terminee')),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  quiz_scores        jsonb not null default '{}'::jsonb,   -- id du bloc quiz → meilleur score (%)
  quiz_attempts      integer not null default 0 check (quiz_attempts >= 0),
  checklist          jsonb not null default '{}'::jsonb,   -- id du bloc checklist → items cochés
  constraint academy_progress_enrollment_lesson_key unique (enrollment_id, lesson_id)
);
create index if not exists academy_progress_lesson_idx on crm.academy_progress (lesson_id);
create index if not exists academy_progress_course_idx on crm.academy_progress (course_id);
create index if not exists academy_progress_contact_idx on crm.academy_progress (contact_id);

create table if not exists crm.academy_assignments (
  id             text primary key default gen_random_uuid()::text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  enrollment_id  text not null references crm.academy_enrollments (id) on delete cascade,
  lesson_id      text not null references crm.academy_lessons (id) on delete cascade,
  block_id       text not null,
  course_id      text not null references crm.academy_courses (id) on delete cascade,
  contact_id     text not null references crm.contacts (id) on delete cascade,
  submitted_at   timestamptz not null default now(),
  content        text not null default '',
  url            text,
  status         text not null default 'soumis' check (status in ('soumis', 'a_reprendre', 'valide')),
  feedback       text,
  grade          numeric(4, 1) check (grade between 0 and 20),
  reviewer_id    text references crm.team_members (id) on delete set null,
  reviewed_at    timestamptz,
  constraint academy_assignments_block_key unique (enrollment_id, lesson_id, block_id)
);
create index if not exists academy_assignments_status_idx on crm.academy_assignments (status, submitted_at);
create index if not exists academy_assignments_lesson_idx on crm.academy_assignments (lesson_id);
create index if not exists academy_assignments_course_idx on crm.academy_assignments (course_id);
create index if not exists academy_assignments_contact_idx on crm.academy_assignments (contact_id);
create index if not exists academy_assignments_reviewer_idx on crm.academy_assignments (reviewer_id);

create table if not exists crm.academy_connections (
  id                text primary key default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  enrollment_id     text not null references crm.academy_enrollments (id) on delete cascade,
  contact_id        text not null references crm.contacts (id) on delete cascade,
  course_id         text not null references crm.academy_courses (id) on delete cascade,
  started_at        timestamptz not null,
  ended_at          timestamptz not null,
  duration_seconds  integer not null default 0 check (duration_seconds >= 0),
  lesson_ids        text[] not null default '{}',
  device            text,
  constraint academy_connections_dates_check check (ended_at >= started_at)
);
create index if not exists academy_connections_enrollment_idx on crm.academy_connections (enrollment_id, ended_at desc);
create index if not exists academy_connections_contact_idx on crm.academy_connections (contact_id);
create index if not exists academy_connections_course_idx on crm.academy_connections (course_id);

-- updated_at automatique (même trigger que les autres tables du schéma).
do $$
declare
  t text;
begin
  foreach t in array array['academy_courses', 'academy_modules', 'academy_lessons', 'academy_paths', 'academy_cohorts',
                           'academy_enrollments', 'academy_progress', 'academy_assignments', 'academy_connections']
  loop
    execute format('create or replace trigger set_updated_at before update on crm.%I for each row execute function crm.tg_set_updated_at()', t);
  end loop;
end;
$$;

-- ───────────────────────────── Journal d'activité ─────────────────────────────

alter table crm.activities drop constraint if exists activities_entity_check;
alter table crm.activities add constraint activities_entity_check check (entity in (
  'users', 'organizations', 'contacts', 'submissions', 'deals', 'tasks', 'sequences', 'emailTemplates', 'emails',
  'events', 'speakers', 'applications', 'projects', 'attendances', 'evaluations', 'complaints', 'indicators',
  'evidences', 'improvementActions', 'watchItems', 'quotes', 'invoices', 'payments', 'bankTransactions',
  'resources', 'contents', 'automations', 'offers',
  'courses', 'courseModules', 'lessons', 'academyPaths', 'enrollments', 'lessonProgress', 'assignments',
  'learnerConnections', 'cohorts'));

-- Audit hors session d'un membre (API /api/academy/*, achats Stripe, SQL) — cf. migration 5.
create or replace trigger audit_academy_courses after insert or update of status on crm.academy_courses
  for each row execute function crm.tg_audit('courses', 'status', 'Formation créée', 'Statut');
create or replace trigger audit_academy_enrollments after insert or update of status on crm.academy_enrollments
  for each row execute function crm.tg_audit('enrollments', 'status', 'Accès Academy ouvert', 'Statut');
create or replace trigger audit_academy_assignments after insert or update of status on crm.academy_assignments
  for each row execute function crm.tg_audit('assignments', 'status', 'Livrable remis', 'Statut');

-- ───────────────────────────── Droits : section « academy » ─────────────────────────────

-- Copie conforme de PERMISSIONS (src/lib/auth/permissions.ts), section « academy » ajoutée.
create or replace function crm.section_access(p_role text, p_section text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_role is null or p_section is null then 'none'
    when p_role = 'admin' then
      case when p_section = any (array[
        'dashboard', 'demandes', 'contacts', 'organisations', 'pipeline', 'relances', 'emails', 'candidatures', 'projets',
        'sessions', 'intervenants', 'qualiopi', 'facturation', 'ressources', 'contenus', 'academy', 'analytics', 'automatisations', 'parametres'
      ]) then 'write' else 'none' end
    when p_role = 'commercial' then
      case
        when p_section = any (array['dashboard', 'demandes', 'contacts', 'organisations', 'pipeline', 'relances', 'emails', 'candidatures', 'facturation']) then 'write'
        when p_section = any (array['projets', 'sessions', 'intervenants', 'qualiopi', 'ressources', 'contenus', 'academy', 'analytics', 'automatisations']) then 'read'
        else 'none'
      end
    when p_role = 'pedagogie' then
      case
        when p_section = any (array['dashboard', 'relances', 'emails', 'candidatures', 'projets', 'sessions', 'intervenants', 'qualiopi', 'ressources', 'contenus', 'academy']) then 'write'
        when p_section = any (array['demandes', 'contacts', 'organisations', 'pipeline', 'facturation', 'analytics', 'automatisations']) then 'read'
        else 'none'
      end
    when p_role = 'formateur' then
      case
        -- academy en écriture : correction des livrables et suivi des apprenants.
        when p_section = any (array['dashboard', 'relances', 'projets', 'sessions', 'academy']) then 'write'
        -- contacts en lecture : noms des participants (émargement, évaluations, projets suivis)
        when p_section = any (array['candidatures', 'ressources', 'intervenants', 'contacts']) then 'read'
        else 'none'
      end
    when p_role = 'lecture' then
      case
        when p_section = 'dashboard' then 'write'
        when p_section = any (array[
          'demandes', 'contacts', 'organisations', 'pipeline', 'relances', 'emails', 'candidatures', 'projets',
          'sessions', 'intervenants', 'qualiopi', 'facturation', 'ressources', 'contenus', 'academy', 'analytics', 'automatisations'
        ]) then 'read'
        else 'none'
      end
    else 'none'
  end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['academy_courses', 'academy_modules', 'academy_lessons', 'academy_paths', 'academy_cohorts',
                           'academy_enrollments', 'academy_progress', 'academy_assignments', 'academy_connections']
  loop
    execute format('alter table crm.%I enable row level security', t);
    execute format('drop policy if exists %I on crm.%I', t || '_read', t);
    execute format('create policy %I on crm.%I for select to authenticated using ((select crm.has_access(''academy'', ''read'')))', t || '_read', t);
    execute format('drop policy if exists %I on crm.%I', t || '_insert', t);
    execute format('create policy %I on crm.%I for insert to authenticated with check ((select crm.has_access(''academy'', ''write'')))', t || '_insert', t);
    execute format('drop policy if exists %I on crm.%I', t || '_update', t);
    execute format('create policy %I on crm.%I for update to authenticated using ((select crm.has_access(''academy'', ''write''))) with check ((select crm.has_access(''academy'', ''write'')))', t || '_update', t);
    execute format('drop policy if exists %I on crm.%I', t || '_delete', t);
    execute format('create policy %I on crm.%I for delete to authenticated using ((select crm.has_access(''academy'', ''write'')))', t || '_delete', t);
  end loop;
end;
$$;

-- Droits explicites (les privilèges par défaut de la migration 2 couvrent déjà les nouvelles tables).
revoke all on crm.academy_courses, crm.academy_modules, crm.academy_lessons, crm.academy_paths, crm.academy_cohorts,
  crm.academy_enrollments, crm.academy_progress, crm.academy_assignments, crm.academy_connections from public, anon;
grant select, insert, update, delete on crm.academy_courses, crm.academy_modules, crm.academy_lessons, crm.academy_paths, crm.academy_cohorts,
  crm.academy_enrollments, crm.academy_progress, crm.academy_assignments, crm.academy_connections to authenticated;
grant all on crm.academy_courses, crm.academy_modules, crm.academy_lessons, crm.academy_paths, crm.academy_cohorts,
  crm.academy_enrollments, crm.academy_progress, crm.academy_assignments, crm.academy_connections to service_role;

-- section_access() est remplacée (CREATE OR REPLACE conserve ses droits) : on les réaffirme par sécurité.
revoke execute on function crm.section_access(text, text) from public, anon;
grant execute on function crm.section_access(text, text) to authenticated, service_role;
