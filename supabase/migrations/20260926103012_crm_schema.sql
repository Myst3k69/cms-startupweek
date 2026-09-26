-- ════════════════════════════════════════════════════════════════════════════
-- StartupWeek OS — 1/4 : schéma `crm`
--
-- Traduction 1-pour-1 de src/lib/domain/types.ts (camelCase ↔ snake_case des clés
-- de premier niveau, cf. src/lib/data/sync.ts) :
--   • id text (les ids préfixés de la démo « ct_… » restent valides) ;
--   • enums TypeScript → text + CHECK (plus simple à faire évoluer qu'un type enum) ;
--   • montants → integer en centimes ; dates → timestamptz (date pour les jours) ;
--   • objets / listes d'objets → jsonb (clés internes en camelCase) ;
--   • listes de chaînes / d'ids → text[] (int[] pour les codes d'indicateurs).
-- Colonnes « extra » (absentes de types.ts) : airtable_record_id (import idempotent),
-- organizations.name_key (dédoublonnage), submissions.meta / raw (preuve de
-- consentement, rejeu), team_members.auth_user_id (migration 2).
--
-- Ne touche à AUCUNE table du schéma public (la synchro vers public.event est
-- dans la migration 3).
-- ════════════════════════════════════════════════════════════════════════════

create schema if not exists crm;
comment on schema crm is 'StartupWeek OS — CRM / back-office (remplace Airtable + workflows n8n).';

-- ───────────────────────────── Fonctions utilitaires ─────────────────────────────

-- updated_at automatique.
create or replace function crm.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Clé de dédoublonnage d'une organisation : minuscules, sans accents, sans
-- ponctuation ni forme juridique (« ACME SAS » = « Acmé »). Miroir exact de
-- normalizeOrgName() dans src/lib/server/intake.ts — garder les deux synchronisés.
create or replace function crm.normalize_name(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(
              replace(replace(lower(coalesce(p, '')), 'œ', 'oe'), 'æ', 'ae'),
              'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
              'aaaaaaceeeeiiiinooooouuuuyy'
            ),
            '[^a-z0-9]+', ' ', 'g'
          ),
          '\m(sas|sasu|sarl|eurl|sa|sci|scop|inc|ltd|llc|gmbh)\M', ' ', 'g'
        ),
        ' +', ' ', 'g'
      )
    ),
    ''
  );
$$;

-- Total TTC (centimes) d'une liste de LineItem, même arrondi que lineTotal()
-- de src/lib/format.ts : HT = round(qté × PU), TVA = round(HT × taux / 100).
create or replace function crm.lines_total_cents(p_lines jsonb)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(sum(t.ht + round(t.ht * t.vat / 100.0)), 0)::integer
  from (
    select round(coalesce((l ->> 'quantity')::numeric, 0) * coalesce((l ->> 'unitPriceCents')::numeric, 0)) as ht,
           coalesce((l ->> 'vatRate')::numeric, 0) as vat
    from jsonb_array_elements(case when jsonb_typeof(p_lines) = 'array' then p_lines else '[]'::jsonb end) as l
  ) as t;
$$;

-- Identifiant du membre d'équipe connecté. Version provisoire (système) :
-- remplacée par la vraie implémentation (auth.uid()) dans la migration 2.
create or replace function crm.current_member_id()
returns text
language sql
stable
set search_path = ''
as $$
  select null::text;
$$;

-- ───────────────────────────── Équipe ─────────────────────────────

create table if not exists crm.team_members (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  role        text not null default 'lecture' check (role in ('admin', 'commercial', 'pedagogie', 'formateur', 'lecture')),
  title       text not null default '',
  color       text not null default '#6366f1',
  active      boolean not null default true
);
create unique index if not exists team_members_email_key on crm.team_members (lower(email));

-- ───────────────────────────── CRM ─────────────────────────────

create table if not exists crm.organizations (
  id                 text primary key default gen_random_uuid()::text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  name               text not null,
  type               text not null default 'autre' check (type in ('ecole', 'entreprise', 'incubateur', 'collectivite', 'investisseur', 'media', 'financeur', 'lieu', 'autre')),
  status             text not null default 'prospect' check (status in ('prospect', 'client', 'partenaire', 'inactif')),
  sector             text,
  size               text check (size in ('1-10', '11-50', '51-200', '201-500', '500+')),
  city               text,
  country            text,
  website            text,
  siret              text,
  vat_number         text,
  billing_email      text,
  address            text,
  owner_id           text references crm.team_members (id) on delete set null,
  tags               text[] not null default '{}',
  notes              text,
  -- extra : clé de dédoublonnage (maintenue par trigger) et import Airtable
  name_key           text,
  airtable_record_id text unique
);
create index if not exists organizations_name_key_idx on crm.organizations (name_key);
create index if not exists organizations_status_idx on crm.organizations (status);
create index if not exists organizations_type_idx on crm.organizations (type);

create or replace function crm.tg_organizations_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.name_key := crm.normalize_name(new.name);
  return new;
end;
$$;
create trigger organizations_normalize
  before insert or update of name on crm.organizations
  for each row execute function crm.tg_organizations_normalize();

create table if not exists crm.contacts (
  id                 text primary key default gen_random_uuid()::text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  first_name         text not null default '',
  last_name          text not null default '',
  email              text not null check (position('@' in email) > 1),
  phone              text,
  city               text,
  country            text,
  age                integer check (age between 0 and 120),
  job_title          text,
  org_id             text references crm.organizations (id) on delete set null,
  linkedin           text,
  lifecycle          text not null default 'lead' check (lifecycle in ('lead', 'prospect', 'candidat', 'participant', 'alumni', 'client', 'partenaire')),
  source             text not null default 'autre' check (source in (
                       'site_candidature', 'site_contact', 'site_entreprise', 'site_accompagnement', 'site_partenariat',
                       'digital_starter_kit', 'newsletter', 'linkedin', 'instagram', 'recommandation', 'evenement',
                       'ecole', 'import_airtable', 'autre')),
  utm                jsonb,
  tags               text[] not null default '{}',
  owner_id           text references crm.team_members (id) on delete set null,
  consent            jsonb not null default '{"gdpr": false, "marketing": false}'::jsonb,
  score              integer not null default 0 check (score between 0 and 100),
  last_contact_at    timestamptz,
  notes              text,
  airtable_record_id text unique
);
-- Email normalisé (trim + minuscules) = clé unique de dédoublonnage (corrige l'upsert « email exact » de n8n).
create unique index if not exists contacts_email_key on crm.contacts (lower(email));
create index if not exists contacts_lifecycle_idx on crm.contacts (lifecycle);
create index if not exists contacts_source_idx on crm.contacts (source);
create index if not exists contacts_org_idx on crm.contacts (org_id);
create index if not exists contacts_owner_idx on crm.contacts (owner_id);
create index if not exists contacts_created_idx on crm.contacts (created_at desc);
create index if not exists contacts_tags_idx on crm.contacts using gin (tags);

create or replace function crm.tg_contacts_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  new.first_name := btrim(coalesce(new.first_name, ''));
  new.last_name := btrim(coalesce(new.last_name, ''));
  return new;
end;
$$;
create trigger contacts_normalize
  before insert or update of email, first_name, last_name on crm.contacts
  for each row execute function crm.tg_contacts_normalize();

-- Catalogue d'offres (Startup Ready, Signature, Residency…).
create table if not exists crm.offers (
  id             text primary key default gen_random_uuid()::text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  name           text not null,
  kind           text not null default 'session' check (kind in ('session', 'accompagnement', 'mentorat', 'ecole', 'entreprise', 'kit')),
  code           text,
  price_cents    integer not null default 0 check (price_cents >= 0),
  vat_rate       numeric(5, 2) not null default 0 check (vat_rate >= 0),
  description    text not null default '',
  duration_hours numeric(7, 2),
  active         boolean not null default true
);
create unique index if not exists offers_code_key on crm.offers (upper(code)) where code is not null and code <> '';

-- ───────────────────────────── Sessions & intervenants ─────────────────────────────

create table if not exists crm.sessions (
  id                    text primary key default gen_random_uuid()::text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  code                  text not null,          -- SW-0011 : clé commune avec public.event.event_code
  name                  text not null,
  kind                  text not null default 'startup_week' check (kind in ('startup_week', 'startup_village', 'atelier', 'masterclass', 'webinaire', 'demo_day', 'evenement_entreprise')),
  mode                  text not null default 'presentiel' check (mode in ('presentiel', 'distanciel', 'hybride')),
  format                text not null default 'semaine' check (format in ('semaine', 'week_end', 'journee', 'mois')),
  status                text not null default 'brouillon' check (status in ('brouillon', 'prevu', 'inscriptions_ouvertes', 'complet', 'en_cours', 'termine', 'annule')),
  region                text not null default 'France' check (region in ('France', 'Europe', 'Hors Europe')),
  city                  text not null default '',
  venue                 text,
  start_at              timestamptz not null,
  end_at                timestamptz not null,
  registration_deadline timestamptz not null,   -- défaut : début − 7 j (trigger)
  capacity              integer not null default 0 check (capacity >= 0),
  min_capacity          integer not null default 0 check (min_capacity >= 0),
  price_cents           integer not null default 0 check (price_cents >= 0),
  public_price_cents    integer check (public_price_cents >= 0),
  founder_edition       boolean not null default false,
  early_bird            boolean not null default false,
  highlights            text[] not null default '{}',
  description           text not null default '',
  image_url             text,
  is_training           boolean not null default true,
  duration_hours        numeric(7, 2) not null default 0,
  objectives            text[] not null default '{}',
  prerequisites         text not null default '',
  evaluation_methods    text not null default '',
  accessibility         text not null default '',
  program               jsonb not null default '[]'::jsonb,
  speaker_ids           text[] not null default '{}',
  resource_ids          text[] not null default '{}',
  org_id                text references crm.organizations (id) on delete set null,
  budget_cents          integer check (budget_cents >= 0),
  published_on_site     boolean not null default false,
  airtable_record_id    text unique,
  constraint sessions_code_key unique (code),
  constraint sessions_dates_check check (end_at >= start_at)
);
create index if not exists sessions_start_idx on crm.sessions (start_at);
create index if not exists sessions_status_idx on crm.sessions (status);

create or replace function crm.tg_sessions_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code := upper(btrim(new.code));
  if new.registration_deadline is null then
    new.registration_deadline := new.start_at - interval '7 days';
  end if;
  return new;
end;
$$;
create trigger sessions_defaults
  before insert or update of code, registration_deadline, start_at on crm.sessions
  for each row execute function crm.tg_sessions_defaults();

create table if not exists crm.speakers (
  id                text primary key default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  first_name        text not null default '',
  last_name         text not null default '',
  email             text not null default '',
  kind              text not null default 'formateur' check (kind in ('formateur', 'mentor', 'jury', 'coach', 'expert')),
  expertise         text[] not null default '{}',
  bio               text not null default '',
  daily_rate_cents  integer check (daily_rate_cents >= 0),
  cv_on_file        boolean not null default false,   -- Qualiopi ind. 21
  last_training_at  timestamptz,                      -- Qualiopi ind. 22
  qualifications    text[] not null default '{}',
  rating            numeric(3, 2) check (rating between 0 and 5),
  contract_type     text not null default 'freelance' check (contract_type in ('salarie', 'freelance', 'benevole')),
  city              text,
  airtable_record_id text unique
);
create unique index if not exists speakers_email_key on crm.speakers (lower(email)) where email <> '';

-- ───────────────────────────── Projets ─────────────────────────────

create table if not exists crm.projects (
  id               text primary key default gen_random_uuid()::text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  name             text not null,
  tagline          text not null default '',
  description      text not null default '',
  stage            text not null default 'idee' check (stage in ('idee', 'cadrage', 'prototype', 'mvp', 'lance', 'traction')),
  sector           text not null default '',
  target_market    text not null default '',
  founder_ids      text[] not null default '{}',   -- contacts
  event_ids        text[] not null default '{}',   -- sessions
  mentor_ids       text[] not null default '{}',   -- speakers
  six_month_goals  text not null default '',
  mvp_url          text,
  deck_url         text,
  milestones       jsonb not null default '[]'::jsonb,
  metrics          jsonb not null default '{}'::jsonb,
  health           text not null default 'on_track' check (health in ('on_track', 'a_risque', 'bloque', 'en_pause')),
  last_update_at   timestamptz not null default now(),
  last_update_note text,
  awards           text[] not null default '{}',
  follow_up_at     timestamptz,
  airtable_record_id text unique
);
create index if not exists projects_founders_idx on crm.projects using gin (founder_ids);
create index if not exists projects_events_idx on crm.projects using gin (event_ids);

-- ───────────────────────────── Demandes entrantes ─────────────────────────────

create table if not exists crm.submissions (
  id              text primary key default gen_random_uuid()::text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  type            text not null check (type in ('candidature', 'contact', 'entreprise', 'accompagnement', 'partenariat', 'digital_starter_kit', 'reclamation', 'newsletter')),
  status          text not null default 'nouvelle' check (status in ('nouvelle', 'en_cours', 'qualifiee', 'convertie', 'archivee', 'spam')),
  received_at     timestamptz not null default now(),
  name            text not null default '',
  email           text not null,
  phone           text,
  company         text,
  subject         text,
  message         text,
  fields          jsonb not null default '{}'::jsonb,   -- Record<string, string>
  contact_id      text references crm.contacts (id) on delete set null,
  org_id          text references crm.organizations (id) on delete set null,
  deal_id         text,      -- FK ajoutée plus bas (dépendance circulaire)
  application_id  text,      -- FK ajoutée plus bas
  complaint_id    text,      -- FK ajoutée plus bas
  assignee_id     text references crm.team_members (id) on delete set null,
  sla_due_at      timestamptz,
  answered_at     timestamptz,
  idempotency_key text,          -- leadId du tunnel candidature, sinon empreinte du payload
  utm             jsonb,
  consent         jsonb not null default '{"gdpr": false, "marketing": false}'::jsonb,
  -- extra : métadonnées techniques (origin, ipAddress, userAgent) et payload brut (preuve / rejeu)
  meta            jsonb not null default '{}'::jsonb,
  raw             jsonb,
  airtable_record_id text unique
);
create index if not exists submissions_status_idx on crm.submissions (status);
create index if not exists submissions_type_idx on crm.submissions (type);
create index if not exists submissions_received_idx on crm.submissions (received_at desc);
create index if not exists submissions_contact_idx on crm.submissions (contact_id);
create index if not exists submissions_sla_idx on crm.submissions (sla_due_at) where status in ('nouvelle', 'en_cours');
create unique index if not exists submissions_idempotency_key on crm.submissions (type, idempotency_key) where idempotency_key is not null;

create or replace function crm.tg_submissions_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;
create trigger submissions_normalize
  before insert or update of email on crm.submissions
  for each row execute function crm.tg_submissions_normalize();

-- ───────────────────────────── Pipeline ─────────────────────────────

create table if not exists crm.deals (
  id                text primary key default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  title             text not null,
  type              text not null default 'entreprise' check (type in ('entreprise', 'ecole', 'partenariat', 'accompagnement', 'sponsoring', 'session')),
  stage             text not null default 'nouveau' check (stage in ('nouveau', 'qualification', 'rdv', 'proposition', 'negociation', 'gagne', 'perdu')),
  amount_cents      integer not null default 0 check (amount_cents >= 0),
  probability       integer not null default 10 check (probability between 0 and 100),
  org_id            text references crm.organizations (id) on delete set null,
  contact_id        text references crm.contacts (id) on delete set null,
  owner_id          text references crm.team_members (id) on delete set null,
  event_id          text references crm.sessions (id) on delete set null,
  quote_id          text,     -- FK ajoutée plus bas
  expected_close_at timestamptz,
  closed_at         timestamptz,
  lost_reason       text,
  next_step         text,
  source            text check (source in (
                       'site_candidature', 'site_contact', 'site_entreprise', 'site_accompagnement', 'site_partenariat',
                       'digital_starter_kit', 'newsletter', 'linkedin', 'instagram', 'recommandation', 'evenement',
                       'ecole', 'import_airtable', 'autre')),
  submission_id     text references crm.submissions (id) on delete set null,
  airtable_record_id text unique
);
create index if not exists deals_stage_idx on crm.deals (stage);
create index if not exists deals_owner_idx on crm.deals (owner_id);
create index if not exists deals_org_idx on crm.deals (org_id);
create index if not exists deals_contact_idx on crm.deals (contact_id);
create index if not exists deals_close_idx on crm.deals (expected_close_at);

-- ───────────────────────────── Relances & emails ─────────────────────────────

create table if not exists crm.sequences (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null,
  description text not null default '',
  trigger     text not null check (trigger in (
                'demande_sans_reponse', 'devis_envoye', 'facture_echue', 'candidature_incomplete', 'candidature_acceptee',
                'session_j_moins_7', 'session_j_plus_1', 'evaluation_froid', 'digital_starter_kit', 'relance_alumni')),
  active      boolean not null default true,
  steps       jsonb not null default '[]'::jsonb,   -- SequenceStep[]
  enrolled    integer not null default 0 check (enrolled >= 0),
  completed   integer not null default 0 check (completed >= 0),
  replied     integer not null default 0 check (replied >= 0)
);
create index if not exists sequences_trigger_idx on crm.sequences (trigger) where active;

create table if not exists crm.tasks (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  title       text not null,
  kind        text not null default 'relance' check (kind in ('appel', 'email', 'relance', 'rdv', 'admin', 'qualiopi', 'paiement')),
  priority    text not null default 'normale' check (priority in ('basse', 'normale', 'haute', 'urgente')),
  due_at      timestamptz not null,
  done_at     timestamptz,
  assignee_id text references crm.team_members (id) on delete set null,
  related     jsonb,                 -- EntityRef { entity, id }
  sequence_id text references crm.sequences (id) on delete set null,
  automated   boolean not null default false,
  notes       text
);
create index if not exists tasks_open_due_idx on crm.tasks (due_at) where done_at is null;
create index if not exists tasks_assignee_idx on crm.tasks (assignee_id);
create index if not exists tasks_related_idx on crm.tasks ((related ->> 'entity'), (related ->> 'id'));

create table if not exists crm.email_templates (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text not null,
  category     text not null default 'interne' check (category in ('accuse_reception', 'candidature', 'relance', 'facturation', 'qualiopi', 'nurturing', 'interne')),
  subject      text not null default '',
  body         text not null default '',
  variables    text[] not null default '{}',
  replaces_n8n text
);

create table if not exists crm.email_messages (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  "to"         text not null,
  subject      text not null default '',
  body         text not null default '',
  template_id  text references crm.email_templates (id) on delete set null,
  status       text not null default 'brouillon' check (status in ('brouillon', 'programme', 'envoye', 'ouvert', 'clique', 'erreur')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  opened_at    timestamptz,
  related      jsonb,                -- EntityRef
  sequence_id  text references crm.sequences (id) on delete set null
);
create index if not exists email_messages_status_idx on crm.email_messages (status);
create index if not exists email_messages_scheduled_idx on crm.email_messages (scheduled_at) where status = 'programme';
create index if not exists email_messages_related_idx on crm.email_messages ((related ->> 'entity'), (related ->> 'id'));

-- ───────────────────────────── Candidatures ─────────────────────────────

create table if not exists crm.applications (
  id                    text primary key default gen_random_uuid()::text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  number                integer generated by default as identity,   -- « Id Candidature » #74…
  -- NB : nullable en base (candidature « diagnostic » ou code session inconnu) alors que
  -- types.ts déclare eventId obligatoire. On delete restrict : une session ayant des
  -- candidatures s'annule, elle ne se supprime pas.
  event_id              text references crm.sessions (id) on delete restrict,
  contact_id            text not null references crm.contacts (id) on delete cascade,
  project_id            text references crm.projects (id) on delete set null,
  offer_id              text references crm.offers (id) on delete set null,
  status                text not null default 'nouvelle' check (status in ('nouvelle', 'qualifiee', 'entretien', 'acceptee', 'inscrite', 'liste_attente', 'refusee', 'hors_cible', 'desistee')),
  lead_stage            text not null default 'capture' check (lead_stage in ('capture', 'qualification', 'out_of_scope', 'booking', 'enrichment')),
  intent                text not null default 'candidature' check (intent in ('candidature', 'diagnostic')),
  persona               text not null default 'non_tech' check (persona in ('tech', 'non_tech', 'reconversion')),
  submitted_at          timestamptz not null default now(),
  reviewer_id           text references crm.team_members (id) on delete set null,
  score                 integer not null default 0 check (score between 0 and 100),
  score_detail          jsonb not null default '{"motivation": 0, "projet": 0, "disponibilite": 0, "adequation": 0}'::jsonb,
  motivation            text not null default '',
  entrepreneurial_xp    text not null default 'aucune' check (entrepreneurial_xp in ('aucune', 'premiere', 'quelques', 'experimente', 'serial')),
  technical_xp          text not null default 'debutant' check (technical_xp in ('debutant', 'basique', 'intermediaire', 'avance', 'expert')),
  availability          text not null default '',
  budget                text not null default '',
  heard_from            text,
  interview_at          timestamptz,
  decision_at           timestamptz,
  funding               text not null default 'personnel' check (funding in ('personnel', 'entreprise', 'opco', 'france_travail', 'cpf', 'ecole', 'region', 'gratuit')),
  funder_name           text,
  needs_analysis_done   boolean not null default false,   -- Qualiopi ind. 4
  positioning_score     numeric(4, 1) check (positioning_score between 0 and 10),   -- ind. 8
  prerequisites_ok      boolean not null default false,   -- ind. 8
  accessibility_needs   text,                              -- ind. 26
  accommodations        text,
  convocation_sent_at   timestamptz,                       -- ind. 9
  agreement_signed_at   timestamptz,
  certificate_issued_at timestamptz,
  amount_due_cents      integer not null default 0 check (amount_due_cents >= 0),
  amount_paid_cents     integer not null default 0,
  invoice_id            text,     -- FK ajoutée plus bas
  idempotency_key       text,     -- leadId du tunnel
  utm                   jsonb,
  airtable_record_id    text unique,
  constraint applications_number_key unique (number)
);
create unique index if not exists applications_idempotency_key on crm.applications (idempotency_key) where idempotency_key is not null;
create index if not exists applications_event_idx on crm.applications (event_id);
create index if not exists applications_contact_idx on crm.applications (contact_id);
create index if not exists applications_status_idx on crm.applications (status);
create index if not exists applications_submitted_idx on crm.applications (submitted_at desc);

-- ───────────────────────────── Qualiopi ─────────────────────────────

create table if not exists crm.attendances (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  event_id    text not null references crm.sessions (id) on delete cascade,
  contact_id  text not null references crm.contacts (id) on delete cascade,
  date        date not null,
  half_day    text not null check (half_day in ('matin', 'apres_midi')),
  status      text not null default 'present' check (status in ('present', 'absent', 'retard', 'excuse')),
  signed_at   timestamptz,
  method      text not null default 'numerique' check (method in ('numerique', 'papier')),
  constraint attendances_slot_key unique (event_id, contact_id, date, half_day)
);
create index if not exists attendances_contact_idx on crm.attendances (contact_id);

create table if not exists crm.evaluations (
  id                 text primary key default gen_random_uuid()::text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  event_id           text not null references crm.sessions (id) on delete cascade,
  contact_id         text references crm.contacts (id) on delete set null,   -- évaluation conservée anonymisée
  speaker_id         text references crm.speakers (id) on delete set null,
  kind               text not null check (kind in ('positionnement', 'acquis', 'a_chaud', 'a_froid', 'financeur', 'intervenant', 'entreprise')),
  submitted_at       timestamptz not null default now(),
  nps                integer check (nps between 0 and 10),
  satisfaction       numeric(3, 1) check (satisfaction between 1 and 5),
  objectives_reached numeric(6, 2),
  scores             jsonb not null default '{}'::jsonb,
  comment            text
);
create index if not exists evaluations_event_idx on crm.evaluations (event_id, kind);
create index if not exists evaluations_contact_idx on crm.evaluations (contact_id);

create table if not exists crm.improvement_actions (
  id              text primary key default gen_random_uuid()::text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  title           text not null,
  description     text not null default '',
  origin          text not null default 'interne' check (origin in ('reclamation', 'evaluation', 'audit_blanc', 'veille', 'interne', 'intervenant')),
  origin_ref      jsonb,           -- EntityRef
  indicator_codes integer[] not null default '{}',
  owner_id        text references crm.team_members (id) on delete set null,
  due_at          timestamptz,
  done_at         timestamptz,
  status          text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'fait', 'abandonne')),
  impact          text
);
create index if not exists improvement_actions_status_idx on crm.improvement_actions (status, due_at);

create table if not exists crm.complaints (
  id                      text primary key default gen_random_uuid()::text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  number                  text not null default '',   -- REC-2026-004, attribué par trigger (migration 3)
  received_at             timestamptz not null default now(),
  channel                 text not null default 'formulaire' check (channel in ('formulaire', 'email', 'telephone', 'oral', 'evaluation')),
  type                    text not null default 'autre' check (type in ('qualite', 'organisation', 'paiement', 'remboursement', 'annulation', 'accessibilite', 'autre')),
  severity                text not null default 'mineure' check (severity in ('mineure', 'majeure')),
  status                  text not null default 'recue' check (status in ('recue', 'accusee', 'analyse', 'action', 'cloturee')),
  contact_id              text references crm.contacts (id) on delete set null,
  event_id                text references crm.sessions (id) on delete set null,
  subject                 text not null default '',
  description             text not null default '',
  ack_at                  timestamptz,    -- accusé de réception (engagement 48 h ouvrées)
  analysis                text,
  response                text,
  corrective_action       text,
  improvement_action_id   text references crm.improvement_actions (id) on delete set null,
  closed_at               timestamptz,
  owner_id                text references crm.team_members (id) on delete set null,
  satisfied_with_response boolean,
  airtable_record_id      text unique
);
create unique index if not exists complaints_number_key on crm.complaints (number) where number <> '';
create index if not exists complaints_status_idx on crm.complaints (status);
create index if not exists complaints_received_idx on crm.complaints (received_at desc);

create table if not exists crm.qualiopi_indicators (
  id                text primary key default gen_random_uuid()::text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  code              integer not null check (code between 1 and 32),
  criterion         integer not null check (criterion between 1 and 7),
  title             text not null,
  expectation       text not null default '',
  evidence_hints    text[] not null default '{}',
  status            text not null default 'a_faire' check (status in ('conforme', 'partiel', 'non_conforme', 'a_faire', 'non_applicable')),
  owner_id          text references crm.team_members (id) on delete set null,
  notes             text,
  last_reviewed_at  timestamptz,
  newcomer_deferred boolean not null default false,
  auto_source       text check (auto_source in (
                      'resultats_publies', 'analyse_besoin', 'positionnement', 'convocations', 'emargements', 'evaluations_acquis',
                      'ressources', 'intervenants_cv', 'intervenants_formation', 'veille', 'handicap', 'satisfaction',
                      'reclamations', 'amelioration')),
  constraint qualiopi_indicators_code_key unique (code)
);

create table if not exists crm.resources (
  id                 text primary key default gen_random_uuid()::text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  title              text not null,
  description        text not null default '',
  category           text not null default 'autre' check (category in ('business_plan', 'pitch_deck', 'maquette', 'financier', 'administratif', 'digital', 'pedagogique', 'qualiopi', 'juridique', 'autre')),
  format             text not null default 'pdf' check (format in ('pdf', 'docx', 'xlsx', 'figma', 'notion', 'video', 'lien', 'zip')),
  visibility         text not null default 'interne' check (visibility in ('public', 'participants', 'premium', 'interne')),
  url                text not null default '',
  size_kb            integer check (size_kb >= 0),
  version            text not null default '1.0',
  event_ids          text[] not null default '{}',
  indicator_codes    integer[] not null default '{}',
  downloads          integer not null default 0 check (downloads >= 0),
  owner_id           text references crm.team_members (id) on delete set null,
  airtable_record_id text unique
);
create index if not exists resources_category_idx on crm.resources (category, visibility);
create index if not exists resources_events_idx on crm.resources using gin (event_ids);

create table if not exists crm.qualiopi_evidences (
  id             text primary key default gen_random_uuid()::text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  indicator_code integer not null references crm.qualiopi_indicators (code) on update cascade on delete cascade,
  title          text not null,
  kind           text not null default 'document' check (kind in ('document', 'lien', 'procedure', 'enregistrement')),
  resource_id    text references crm.resources (id) on delete set null,
  url            text,
  owner_id       text references crm.team_members (id) on delete set null,
  valid_until    timestamptz,
  note           text
);
create index if not exists qualiopi_evidences_indicator_idx on crm.qualiopi_evidences (indicator_code);

create table if not exists crm.watch_items (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  kind         text not null check (kind in ('legale', 'metiers', 'pedagogique', 'handicap')),
  title        text not null,
  source       text not null default '',
  url          text,
  published_at timestamptz not null default now(),
  summary      text not null default '',
  impact       text not null default 'aucun' check (impact in ('aucun', 'faible', 'moyen', 'fort')),
  action_id    text references crm.improvement_actions (id) on delete set null
);
create index if not exists watch_items_kind_idx on crm.watch_items (kind, published_at desc);

-- ───────────────────────────── Facturation ─────────────────────────────

create table if not exists crm.quotes (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  number      text not null default '',   -- D-2026-0012 (attribué par trigger si vide, migration 3)
  status      text not null default 'brouillon' check (status in ('brouillon', 'envoye', 'accepte', 'refuse', 'expire')),
  org_id      text references crm.organizations (id) on delete set null,
  contact_id  text references crm.contacts (id) on delete set null,
  deal_id     text references crm.deals (id) on delete set null,
  event_id    text references crm.sessions (id) on delete set null,
  issued_at   timestamptz not null default now(),
  valid_until timestamptz not null default (now() + interval '30 days'),
  lines       jsonb not null default '[]'::jsonb,   -- LineItem[]
  notes       text,
  sent_at     timestamptz,
  accepted_at timestamptz,
  invoice_id  text      -- FK ajoutée plus bas
);
create unique index if not exists quotes_number_key on crm.quotes (number) where number <> '';
create index if not exists quotes_status_idx on crm.quotes (status);
create index if not exists quotes_org_idx on crm.quotes (org_id);

create table if not exists crm.invoices (
  id                  text primary key default gen_random_uuid()::text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  number              text not null default '',   -- F-2026-0042 : séquentiel sans trou (trigger, migration 3)
  kind                text not null default 'facture' check (kind in ('facture', 'acompte', 'solde', 'avoir')),
  status              text not null default 'brouillon' check (status in ('brouillon', 'emise', 'partielle', 'payee', 'en_retard', 'annulee')),
  org_id              text references crm.organizations (id) on delete set null,
  contact_id          text references crm.contacts (id) on delete set null,
  application_id      text references crm.applications (id) on delete set null,
  event_id            text references crm.sessions (id) on delete set null,
  quote_id            text references crm.quotes (id) on delete set null,
  credited_invoice_id text references crm.invoices (id) on delete set null,
  issued_at           timestamptz not null default now(),
  due_at              timestamptz not null default (now() + interval '30 days'),
  lines               jsonb not null default '[]'::jsonb,   -- LineItem[]
  paid_cents          integer not null default 0,
  preferred_method    text not null default 'virement' check (preferred_method in ('stripe', 'virement', 'opco', 'cb_terminal', 'cheque')),
  stripe_payment_link text,
  funder              jsonb,        -- { name, subrogation, agreementRef }
  reminders_sent      integer not null default 0 check (reminders_sent >= 0),
  last_reminder_at    timestamptz,
  notes               text,
  airtable_record_id  text unique
);
create unique index if not exists invoices_number_key on crm.invoices (number) where number <> '';
create index if not exists invoices_status_idx on crm.invoices (status, due_at);
create index if not exists invoices_org_idx on crm.invoices (org_id);
create index if not exists invoices_contact_idx on crm.invoices (contact_id);
create index if not exists invoices_application_idx on crm.invoices (application_id);
create index if not exists invoices_event_idx on crm.invoices (event_id);

create table if not exists crm.bank_transactions (
  id                 text primary key default gen_random_uuid()::text,   -- « qonto_<uuid> » pour Qonto (idempotence)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  booked_at          timestamptz not null,
  label              text not null default '',
  counterparty       text not null default '',
  amount_cents       integer not null,     -- positif = crédit
  reference          text,
  source             text not null default 'import_csv' check (source in ('qonto', 'stripe_payout', 'import_csv')),
  status             text not null default 'a_rapprocher' check (status in ('a_rapprocher', 'rapproche', 'ignore')),
  matched_invoice_id text references crm.invoices (id) on delete set null,
  payment_id         text    -- FK ajoutée plus bas
);
create index if not exists bank_transactions_status_idx on crm.bank_transactions (status, booked_at desc);
create index if not exists bank_transactions_invoice_idx on crm.bank_transactions (matched_invoice_id);

create table if not exists crm.payments (
  id                  text primary key default gen_random_uuid()::text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  invoice_id          text not null references crm.invoices (id) on delete restrict,
  amount_cents        integer not null check (amount_cents <> 0),   -- négatif = remboursement
  received_at         timestamptz not null default now(),
  method              text not null default 'virement' check (method in ('stripe', 'virement', 'opco', 'cb_terminal', 'cheque')),
  status              text not null default 'reussi' check (status in ('reussi', 'en_attente', 'echoue', 'rembourse')),
  reference           text not null default '',   -- pi_… / qonto:<id> / n° accord OPCO — unique si renseignée (idempotence)
  fee_cents           integer check (fee_cents >= 0),
  bank_transaction_id text references crm.bank_transactions (id) on delete set null
);
create unique index if not exists payments_reference_key on crm.payments (reference) where reference <> '';
create index if not exists payments_invoice_idx on crm.payments (invoice_id);
create index if not exists payments_received_idx on crm.payments (received_at desc);

-- ───────────────────────────── Contenus & automatisations ─────────────────────────────

create table if not exists crm.contents (
  id              text primary key default gen_random_uuid()::text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  title           text not null,
  slug            text not null default '',
  type            text not null default 'article' check (type in ('article', 'page_session', 'temoignage', 'faq', 'newsletter', 'post_linkedin', 'post_instagram', 'etude_de_cas', 'page')),
  status          text not null default 'idee' check (status in ('idee', 'redaction', 'relecture', 'planifie', 'publie', 'archive')),
  channel         text not null default 'blog' check (channel in ('site', 'blog', 'linkedin', 'instagram', 'newsletter')),
  author_id       text references crm.team_members (id) on delete set null,
  excerpt         text not null default '',
  body            text not null default '',     -- Markdown
  tags            text[] not null default '{}',
  seo_title       text,
  seo_description text,
  cover_url       text,
  event_id        text references crm.sessions (id) on delete set null,
  scheduled_at    timestamptz,
  published_at    timestamptz,
  metrics         jsonb not null default '{"views": 0, "clicks": 0, "leads": 0}'::jsonb
);
create index if not exists contents_status_idx on crm.contents (status, scheduled_at);
create index if not exists contents_slug_idx on crm.contents (channel, slug);

create table if not exists crm.automation_rules (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text not null,
  description  text not null default '',
  trigger      text not null check (trigger in (
                 'formulaire_recu', 'candidature_statut', 'devis_statut', 'facture_echeance', 'paiement_recu',
                 'session_date', 'reclamation_recue', 'evaluation_recue', 'planifie')),
  conditions   text not null default '',
  actions      text[] not null default '{}',
  active       boolean not null default true,
  replaces_n8n text[] not null default '{}',
  runs         integer not null default 0 check (runs >= 0),
  last_run_at  timestamptz,
  errors       integer not null default 0 check (errors >= 0)
);

-- ───────────────────────────── Dépendances circulaires ─────────────────────────────

alter table crm.submissions
  add constraint submissions_deal_id_fkey foreign key (deal_id) references crm.deals (id) on delete set null,
  add constraint submissions_application_id_fkey foreign key (application_id) references crm.applications (id) on delete set null,
  add constraint submissions_complaint_id_fkey foreign key (complaint_id) references crm.complaints (id) on delete set null;
alter table crm.deals
  add constraint deals_quote_id_fkey foreign key (quote_id) references crm.quotes (id) on delete set null;
alter table crm.applications
  add constraint applications_invoice_id_fkey foreign key (invoice_id) references crm.invoices (id) on delete set null;
alter table crm.quotes
  add constraint quotes_invoice_id_fkey foreign key (invoice_id) references crm.invoices (id) on delete set null;
alter table crm.bank_transactions
  add constraint bank_transactions_payment_id_fkey foreign key (payment_id) references crm.payments (id) on delete set null;

-- ───────────────────────────── Journal d'activité ─────────────────────────────

create table if not exists crm.activities (
  id        text primary key default gen_random_uuid()::text,
  at        timestamptz not null default now(),
  actor_id  text references crm.team_members (id) on delete set null,   -- null = système / automatisation
  kind      text not null check (kind in ('creation', 'modification', 'statut', 'note', 'email', 'appel', 'paiement', 'document', 'systeme')),
  entity    text not null check (entity in (
              'users', 'organizations', 'contacts', 'submissions', 'deals', 'tasks', 'sequences', 'emailTemplates', 'emails',
              'events', 'speakers', 'applications', 'projects', 'attendances', 'evaluations', 'complaints', 'indicators',
              'evidences', 'improvementActions', 'watchItems', 'quotes', 'invoices', 'payments', 'bankTransactions',
              'resources', 'contents', 'automations', 'offers')),
  entity_id text not null,
  summary   text not null,
  meta      jsonb
);
create index if not exists activities_entity_idx on crm.activities (entity, entity_id, at desc);
create index if not exists activities_at_idx on crm.activities (at desc);
create index if not exists activities_actor_idx on crm.activities (actor_id);

-- Trigger d'audit générique : journalise la création et chaque changement de la
-- colonne de statut. Arguments : (EntityName, colonne suivie, résumé de création, libellé du statut).
create or replace function crm.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := tg_argv[0];
  v_col    text := coalesce(tg_argv[1], 'status');
  v_create text := coalesce(tg_argv[2], 'Élément créé');
  v_label  text := coalesce(tg_argv[3], 'Statut');
  v_new    jsonb := to_jsonb(new);
  v_from   text;
  v_to     text := v_new ->> v_col;
begin
  if tg_op = 'INSERT' then
    insert into crm.activities (actor_id, kind, entity, entity_id, summary, meta)
    values (crm.current_member_id(), 'creation', v_entity, v_new ->> 'id', v_create,
            jsonb_build_object(v_col, coalesce(v_to, '')));
  elsif tg_op = 'UPDATE' then
    v_from := to_jsonb(old) ->> v_col;
    if v_from is distinct from v_to then
      insert into crm.activities (actor_id, kind, entity, entity_id, summary, meta)
      values (crm.current_member_id(), 'statut', v_entity, v_new ->> 'id',
              format('%s : %s → %s', v_label, coalesce(v_from, '—'), coalesce(v_to, '—')),
              jsonb_build_object('field', v_col, 'from', coalesce(v_from, ''), 'to', coalesce(v_to, '')));
    end if;
  end if;
  return null;
end;
$$;

create trigger audit_organizations after insert or update of status on crm.organizations
  for each row execute function crm.tg_audit('organizations', 'status', 'Organisation créée', 'Statut');
create trigger audit_contacts after insert or update of lifecycle on crm.contacts
  for each row execute function crm.tg_audit('contacts', 'lifecycle', 'Contact créé', 'Cycle de vie');
create trigger audit_submissions after insert or update of status on crm.submissions
  for each row execute function crm.tg_audit('submissions', 'status', 'Demande reçue', 'Statut');
create trigger audit_deals after insert or update of stage on crm.deals
  for each row execute function crm.tg_audit('deals', 'stage', 'Opportunité créée', 'Étape');
create trigger audit_sessions after insert or update of status on crm.sessions
  for each row execute function crm.tg_audit('events', 'status', 'Session créée', 'Statut');
create trigger audit_applications after insert or update of status on crm.applications
  for each row execute function crm.tg_audit('applications', 'status', 'Candidature créée', 'Statut');
create trigger audit_projects after insert or update of health on crm.projects
  for each row execute function crm.tg_audit('projects', 'health', 'Projet créé', 'Santé');
create trigger audit_complaints after insert or update of status on crm.complaints
  for each row execute function crm.tg_audit('complaints', 'status', 'Réclamation enregistrée', 'Statut');
create trigger audit_improvement_actions after insert or update of status on crm.improvement_actions
  for each row execute function crm.tg_audit('improvementActions', 'status', 'Action d''amélioration créée', 'Statut');
-- Indicateurs : uniquement les changements de statut (le référentiel est inséré par la migration 4).
create trigger audit_indicators after update of status on crm.qualiopi_indicators
  for each row execute function crm.tg_audit('indicators', 'status', 'Indicateur créé', 'Statut');
create trigger audit_quotes after insert or update of status on crm.quotes
  for each row execute function crm.tg_audit('quotes', 'status', 'Devis créé', 'Statut');
create trigger audit_invoices after insert or update of status on crm.invoices
  for each row execute function crm.tg_audit('invoices', 'status', 'Facture créée', 'Statut');
create trigger audit_bank_transactions after update of status on crm.bank_transactions
  for each row execute function crm.tg_audit('bankTransactions', 'status', 'Transaction importée', 'Rapprochement');
create trigger audit_contents after insert or update of status on crm.contents
  for each row execute function crm.tg_audit('contents', 'status', 'Contenu créé', 'Statut');

-- ───────────────────────────── Paramètres (singleton) ─────────────────────────────

create table if not exists crm.settings (
  id                  boolean primary key default true check (id),   -- une seule ligne
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  legal_name          text not null default '',
  brand               text not null default '',
  siret               text not null default '',
  nda                 text not null default '',     -- n° de déclaration d'activité (organisme de formation)
  address             text not null default '',
  email               text not null default '',
  phone               text not null default '',
  website             text not null default '',
  iban                text not null default '',
  vat_exempt          boolean not null default true,  -- exonération TVA formation (art. 261-4-4° CGI)
  invoice_prefix      text not null default 'F',
  quote_prefix        text not null default 'D',
  payment_terms_days  integer not null default 30 check (payment_terms_days >= 0),
  late_penalty_text   text not null default '',
  quality_lead_id     text references crm.team_members (id) on delete set null,
  disability_lead_id  text references crm.team_members (id) on delete set null,   -- référent handicap (ind. 26)
  audit_date          timestamptz,
  audit_body          text,
  newcomer            boolean not null default true,
  complaint_ack_hours integer not null default 48 check (complaint_ack_hours > 0),
  sla_hours           integer not null default 48 check (sla_hours > 0),
  stripe_connected    boolean not null default false,
  qonto_connected     boolean not null default false,
  email_provider      text not null default 'resend' check (email_provider in ('resend', 'smtp', 'brevo')),
  deposit_percent     integer not null default 30 check (deposit_percent between 0 and 100),
  balance_days_before integer not null default 30 check (balance_days_before >= 0),
  data_mode           text not null default 'supabase' check (data_mode in ('demo', 'supabase'))
);

insert into crm.settings (id, legal_name, brand, email, website, late_penalty_text)
values (
  true,
  'INTERSTELLABS SASU',
  'StartupWeek',
  'contact@startupweek.tech',
  'https://www.startupweek.tech',
  'En cas de retard de paiement : pénalités au taux de 3 fois le taux d''intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).'
)
on conflict (id) do nothing;

-- ───────────────────────────── Trafic (analytics) ─────────────────────────────

create table if not exists crm.traffic_days (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  date         date not null,
  visitors     integer not null default 0 check (visitors >= 0),
  pageviews    integer not null default 0 check (pageviews >= 0),
  sources      jsonb not null default '{}'::jsonb,   -- { direct, google, linkedin, instagram, meta_ads, newsletter, partenaires }
  form_starts  integer not null default 0 check (form_starts >= 0),
  form_submits integer not null default 0 check (form_submits >= 0),
  constraint traffic_days_date_key unique (date)
);

-- ───────────────────────────── updated_at sur toutes les tables ─────────────────────────────

do $$
declare
  r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'crm' and c.column_name = 'updated_at' and t.table_type = 'BASE TABLE'
  loop
    execute format(
      'create or replace trigger set_updated_at before update on crm.%I for each row execute function crm.tg_set_updated_at()',
      r.table_name
    );
  end loop;
end;
$$;
