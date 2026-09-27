-- Logistique des sessions (onglet « Logistique » + répertoire « Lieux »).
--
--  • crm.venues             : répertoire des lieux, réutilisable d'une session à l'autre
--  • crm.venue_options      : sourcing — lieux envisagés pour une session (kanban d'étapes)
--  • crm.session_expenses   : devis et dépenses fournisseurs (lieu, traiteur, activités,
--                             intervenants…) avec échéancier de paiement (jsonb)
--  • crm.session_activities : activités proposées pendant la session (hors programme)
--  • crm.session_stays      : séjours — chambre, arrivée, départ, navette, régime
--  • crm.sessions           : + venue_id (lieu retenu) et logistics (infos pratiques, jsonb)
--
-- Données internes à l'équipe : rien n'est recopié vers public.event ni vers le site.
-- Droits : section « sessions » en lecture et en écriture (mêmes rôles que les sessions).
-- Journal : l'interface journalise elle-même (cf. migration crm_auth_membership) ;
-- pas de trigger d'audit sur ces tables (aucune écriture service_role prévue).

-- ───────────────────────────── 1. Répertoire des lieux ─────────────────────────────

create table if not exists crm.venues (
  id                    text primary key default gen_random_uuid()::text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  name                  text not null,
  kind                  text not null default 'villa' check (kind in ('villa', 'chateau', 'chalet', 'domaine', 'riad', 'hotel', 'gite', 'tiers_lieu', 'autre')),
  status                text not null default 'repere' check (status in ('repere', 'en_contact', 'valide', 'ecarte')),
  source                text not null default 'manuel' check (source in ('manuel', 'ia', 'recommandation', 'plateforme')),
  region                text not null default 'France' check (region in ('France', 'Europe', 'Hors Europe')),
  country               text not null default '',
  city                  text not null default '',
  address               text,
  bedrooms              integer check (bedrooms >= 0),
  beds                  integer check (beds >= 0),
  workspace_seats       integer check (workspace_seats >= 0),
  amenities             text[] not null default '{}',
  price_per_night_cents integer check (price_per_night_cents >= 0),
  price_notes           text,
  access_info           text,
  accessibility         text,
  website               text,
  listing_url           text,
  image_url             text,
  contact_name          text,
  contact_email         text,
  contact_phone         text,
  rating                integer check (rating between 1 and 5),
  notes                 text not null default ''
);
create index if not exists venues_status_idx on crm.venues (status);
create index if not exists venues_region_idx on crm.venues (region, country);

-- ───────────────────────────── 2. Sessions : lieu retenu + infos pratiques ─────────────────────────────

alter table crm.sessions add column if not exists venue_id  text references crm.venues (id) on delete set null;
alter table crm.sessions add column if not exists logistics jsonb not null default '{}'::jsonb;  -- SessionLogistics
create index if not exists sessions_venue_idx on crm.sessions (venue_id);

-- ───────────────────────────── 3. Sourcing ─────────────────────────────

create table if not exists crm.venue_options (
  id            text primary key default gen_random_uuid()::text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  event_id      text not null references crm.sessions (id) on delete cascade,
  venue_id      text not null references crm.venues (id) on delete cascade,
  stage         text not null default 'identifie' check (stage in ('identifie', 'demande', 'devis_recu', 'option', 'retenu', 'ecarte')),
  quoted_cents  integer check (quoted_cents >= 0),
  availability  text,
  option_until  timestamptz,
  reject_reason text,
  notes         text not null default '',
  constraint venue_options_event_venue_key unique (event_id, venue_id)
);
create index if not exists venue_options_venue_idx on crm.venue_options (venue_id);

-- ───────────────────────────── 4. Activités ─────────────────────────────

create table if not exists crm.session_activities (
  id         text primary key default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id   text not null references crm.sessions (id) on delete cascade,
  title      text not null,
  kind       text not null default 'autre' check (kind in ('sport', 'culture', 'team_building', 'gastronomie', 'detente', 'networking', 'autre')),
  status     text not null default 'idee' check (status in ('idee', 'a_reserver', 'reserve', 'annule')),
  day        integer check (day >= 1),
  start      text,
  "end"      text,
  location   text,
  provider   text,
  contact    text,
  cost_cents integer check (cost_cents >= 0),
  included   boolean not null default true,
  notes      text not null default ''
);
create index if not exists session_activities_event_idx on crm.session_activities (event_id, day);

-- ───────────────────────────── 5. Devis & dépenses fournisseurs ─────────────────────────────

create table if not exists crm.session_expenses (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  event_id     text not null references crm.sessions (id) on delete cascade,
  category     text not null default 'autre' check (category in ('lieu', 'restauration', 'activite', 'transport', 'intervenant', 'materiel', 'autre')),
  label        text not null,
  supplier     text not null default '',
  status       text not null default 'recu' check (status in ('a_demander', 'demande', 'recu', 'accepte', 'refuse')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  venue_id     text references crm.venues (id) on delete set null,
  speaker_id   text references crm.speakers (id) on delete set null,
  activity_id  text references crm.session_activities (id) on delete set null,
  quote_ref    text,
  quote_url    text,
  received_at  timestamptz,
  valid_until  timestamptz,
  installments jsonb not null default '[]'::jsonb,   -- ExpenseInstallment[] {id, label, amountCents, dueAt, paidAt?, method?, reference?}
  notes        text not null default ''
);
create index if not exists session_expenses_event_idx on crm.session_expenses (event_id);
create index if not exists session_expenses_venue_idx on crm.session_expenses (venue_id);

-- ───────────────────────────── 6. Séjours (chambres & arrivées) ─────────────────────────────

create table if not exists crm.session_stays (
  id             text primary key default gen_random_uuid()::text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  event_id       text not null references crm.sessions (id) on delete cascade,
  role           text not null default 'participant' check (role in ('participant', 'intervenant', 'equipe', 'invite')),
  contact_id     text references crm.contacts (id) on delete cascade,
  speaker_id     text references crm.speakers (id) on delete cascade,
  user_id        text references crm.team_members (id) on delete set null,
  name           text not null default '',
  confirmed      boolean not null default false,
  room           text,
  arrival_at     timestamptz,
  arrival_mode   text check (arrival_mode in ('avion', 'train', 'voiture', 'navette', 'autre')),
  arrival_ref    text,
  departure_at   timestamptz,
  departure_mode text check (departure_mode in ('avion', 'train', 'voiture', 'navette', 'autre')),
  departure_ref  text,
  shuttle        boolean not null default false,
  diet           text,   -- régime / allergies : le minimum nécessaire (donnée potentiellement sensible)
  notes          text
);
create unique index if not exists session_stays_contact_key on crm.session_stays (event_id, contact_id) where contact_id is not null;
create unique index if not exists session_stays_speaker_key on crm.session_stays (event_id, speaker_id) where speaker_id is not null;

-- ───────────────────────────── 7. updated_at ─────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array['venues', 'venue_options', 'session_activities', 'session_expenses', 'session_stays'] loop
    execute format(
      'create or replace trigger set_updated_at before update on crm.%I for each row execute function crm.tg_set_updated_at()', t);
  end loop;
end;
$$;

-- ───────────────────────────── 8. Droits (RLS) : section « sessions » ─────────────────────────────
-- Mêmes policies que la migration 2 (crm_rls) ; les GRANT viennent des privilèges par défaut du schéma.

do $$
declare
  t text;
begin
  foreach t in array array['venues', 'venue_options', 'session_activities', 'session_expenses', 'session_stays'] loop
    execute format('alter table crm.%I enable row level security', t);

    execute format('drop policy if exists %I on crm.%I', t || '_read', t);
    execute format(
      'create policy %I on crm.%I for select to authenticated using ((select crm.has_any_access(%L::text[], ''read'')))',
      t || '_read', t, array['sessions']);

    execute format('drop policy if exists %I on crm.%I', t || '_insert', t);
    execute format(
      'create policy %I on crm.%I for insert to authenticated with check ((select crm.has_any_access(%L::text[], ''write'')))',
      t || '_insert', t, array['sessions']);

    execute format('drop policy if exists %I on crm.%I', t || '_update', t);
    execute format(
      'create policy %I on crm.%I for update to authenticated using ((select crm.has_any_access(%L::text[], ''write''))) with check ((select crm.has_any_access(%L::text[], ''write'')))',
      t || '_update', t, array['sessions'], array['sessions']);

    execute format('drop policy if exists %I on crm.%I', t || '_delete', t);
    execute format(
      'create policy %I on crm.%I for delete to authenticated using ((select crm.has_any_access(%L::text[], ''write'')))',
      t || '_delete', t, array['sessions']);
  end loop;
end;
$$;

-- ───────────────────────────── 9. Journal d'activité : nouvelles entités ─────────────────────────────
-- ATTENTION : toute autre migration qui redéfinit cette contrainte doit reprendre la liste complète.

alter table crm.activities drop constraint if exists activities_entity_check;
alter table crm.activities add constraint activities_entity_check check (entity in (
  'users', 'organizations', 'contacts', 'submissions', 'deals', 'tasks', 'sequences', 'emailTemplates', 'emails',
  'events', 'speakers', 'applications', 'projects', 'attendances', 'evaluations', 'complaints', 'indicators',
  'evidences', 'improvementActions', 'watchItems', 'quotes', 'invoices', 'payments', 'bankTransactions',
  'resources', 'contents', 'automations', 'offers',
  'courses', 'courseModules', 'lessons', 'academyPaths', 'enrollments', 'lessonProgress', 'assignments',   -- migration crm_academy
  'learnerConnections', 'cohorts',
  'venues', 'venueOptions', 'expenses', 'outings', 'stays'));
