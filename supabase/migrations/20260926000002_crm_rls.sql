-- ════════════════════════════════════════════════════════════════════════════
-- StartupWeek OS — 2/4 : authentification équipe & Row Level Security
--
-- • crm.team_members.auth_user_id relie un membre à un compte Supabase Auth.
-- • crm.current_role() / crm.has_access(section, level) reproduisent EXACTEMENT
--   la matrice PERMISSIONS de src/lib/auth/permissions.ts (toute évolution doit
--   être faite aux deux endroits).
-- • RLS activée sur toutes les tables du schéma crm ; policies select (read) et
--   insert / update / delete (write) par section du back-office.
-- • service_role (API serveur : /api/intake, webhooks) possède BYPASSRLS sur
--   Supabase : il n'est pas concerné par ces policies.
-- • anon n'a AUCUN accès au schéma crm (le site passe par /api/intake).
-- ════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────── Lien avec Supabase Auth ─────────────────────────────

alter table crm.team_members
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null;

comment on column crm.team_members.auth_user_id is
  'Compte Supabase Auth du membre (auth.users.id). Sans lien, le membre n''a aucun accès via RLS.';

-- Membre connecté (null = service_role, système, ou utilisateur Auth non rattaché / inactif).
create or replace function crm.current_member_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from crm.team_members m
  where m.auth_user_id = (select auth.uid()) and m.active
  limit 1;
$$;

-- Rôle du membre connecté (admin | commercial | pedagogie | formateur | lecture), null sinon.
-- NB : `current_role` est un mot réservé SQL → toujours l'appeler qualifié : crm.current_role().
create or replace function crm.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from crm.team_members m
  where m.auth_user_id = (select auth.uid()) and m.active
  limit 1;
$$;

-- Matrice rôle × section → 'none' | 'read' | 'write'. Copie conforme de PERMISSIONS
-- (src/lib/auth/permissions.ts) : l'écriture l'emporte sur la lecture.
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
        'sessions', 'intervenants', 'qualiopi', 'facturation', 'ressources', 'contenus', 'analytics', 'automatisations', 'parametres'
      ]) then 'write' else 'none' end
    when p_role = 'commercial' then
      case
        when p_section = any (array['dashboard', 'demandes', 'contacts', 'organisations', 'pipeline', 'relances', 'emails', 'candidatures', 'facturation']) then 'write'
        when p_section = any (array['projets', 'sessions', 'intervenants', 'qualiopi', 'ressources', 'contenus', 'analytics', 'automatisations']) then 'read'
        else 'none'
      end
    when p_role = 'pedagogie' then
      case
        when p_section = any (array['dashboard', 'relances', 'emails', 'candidatures', 'projets', 'sessions', 'intervenants', 'qualiopi', 'ressources', 'contenus']) then 'write'
        when p_section = any (array['demandes', 'contacts', 'organisations', 'pipeline', 'facturation', 'analytics', 'automatisations']) then 'read'
        else 'none'
      end
    when p_role = 'formateur' then
      case
        when p_section = any (array['dashboard', 'relances', 'projets', 'sessions']) then 'write'
        when p_section = any (array['candidatures', 'ressources', 'intervenants']) then 'read'
        else 'none'
      end
    when p_role = 'lecture' then
      case
        when p_section = 'dashboard' then 'write'
        when p_section = any (array[
          'demandes', 'contacts', 'organisations', 'pipeline', 'relances', 'emails', 'candidatures', 'projets',
          'sessions', 'intervenants', 'qualiopi', 'facturation', 'ressources', 'contenus', 'analytics', 'automatisations'
        ]) then 'read'
        else 'none'
      end
    else 'none'
  end;
$$;

-- Le membre connecté a-t-il le niveau demandé ('read' | 'write') sur la section ?
create or replace function crm.has_access(section text, level text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when has_access.level = 'write' then crm.section_access(crm.current_role(), has_access.section) = 'write'
    when has_access.level = 'read' then crm.section_access(crm.current_role(), has_access.section) in ('read', 'write')
    else false
  end;
$$;

-- Variante « au moins une des sections » (attendances / evaluations : qualiopi OU sessions).
create or replace function crm.has_any_access(sections text[], level text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_or(crm.has_access(s, has_any_access.level)), false)
  from unnest(has_any_access.sections) as s;
$$;

-- Tout membre actif de l'équipe (quel que soit son rôle).
create or replace function crm.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select crm.current_role() is not null;
$$;

-- ───────────────────────────── Droits d'accès au schéma ─────────────────────────────

revoke all on schema crm from public, anon;
grant usage on schema crm to authenticated, service_role;

revoke all on all tables in schema crm from public, anon;
grant select, insert, update, delete on all tables in schema crm to authenticated;
grant all on all tables in schema crm to service_role;
grant usage, select on all sequences in schema crm to authenticated, service_role;

revoke execute on all functions in schema crm from public, anon;
grant execute on function
  crm.current_member_id(), crm.current_role(), crm.section_access(text, text),
  crm.has_access(text, text), crm.has_any_access(text[], text), crm.is_team_member(),
  crm.normalize_name(text), crm.lines_total_cents(jsonb)
to authenticated, service_role;

-- Objets créés plus tard dans le schéma (migrations suivantes) : mêmes droits par défaut.
-- NB : EXECUTE sur les fonctions est accordé à PUBLIC globalement par PostgreSQL et ne
-- peut pas être retiré « par schéma » via ALTER DEFAULT PRIVILEGES : chaque migration
-- qui crée des fonctions se termine donc par un REVOKE explicite (cf. migration 3).
alter default privileges in schema crm grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema crm grant all on tables to service_role;
alter default privileges in schema crm grant usage, select on sequences to authenticated, service_role;

-- ───────────────────────────── Policies par section ─────────────────────────────
-- (select crm.fn(...)) : évalué une fois par requête (initPlan) et non par ligne.

do $$
declare
  r record;
begin
  for r in
    select *
    from (values
      -- table                  sections lecture                          sections écriture
      ('organizations',        array['organisations'],                    array['organisations']),
      ('contacts',             array['contacts'],                         array['contacts']),
      ('submissions',          array['demandes'],                         array['demandes']),
      ('deals',                array['pipeline'],                         array['pipeline']),
      ('tasks',                array['relances'],                         array['relances']),
      ('sequences',            array['relances'],                         array['relances']),
      ('email_templates',      array['emails'],                           array['emails']),
      ('email_messages',       array['emails'],                           array['emails']),
      ('sessions',             array['sessions'],                         array['sessions']),
      ('speakers',             array['intervenants'],                     array['intervenants']),
      ('applications',         array['candidatures'],                     array['candidatures']),
      ('projects',             array['projets'],                          array['projets']),
      ('attendances',          array['qualiopi', 'sessions'],             array['qualiopi', 'sessions']),
      ('evaluations',          array['qualiopi', 'sessions'],             array['qualiopi', 'sessions']),
      ('complaints',           array['qualiopi'],                         array['qualiopi']),
      ('qualiopi_indicators',  array['qualiopi'],                         array['qualiopi']),
      ('qualiopi_evidences',   array['qualiopi'],                         array['qualiopi']),
      ('improvement_actions',  array['qualiopi'],                         array['qualiopi']),
      ('watch_items',          array['qualiopi'],                         array['qualiopi']),
      ('quotes',               array['facturation'],                      array['facturation']),
      ('invoices',             array['facturation'],                      array['facturation']),
      ('payments',             array['facturation'],                      array['facturation']),
      ('bank_transactions',    array['facturation'],                      array['facturation']),
      ('resources',            array['ressources'],                       array['ressources']),
      ('contents',             array['contenus'],                         array['contenus']),
      ('automation_rules',     array['automatisations'],                  array['automatisations']),
      ('traffic_days',         array['analytics'],                        array['analytics'])
    ) as t (tbl, read_sections, write_sections)
  loop
    execute format('alter table crm.%I enable row level security', r.tbl);

    execute format('drop policy if exists %I on crm.%I', r.tbl || '_read', r.tbl);
    execute format(
      'create policy %I on crm.%I for select to authenticated using ((select crm.has_any_access(%L::text[], ''read'')))',
      r.tbl || '_read', r.tbl, r.read_sections);

    execute format('drop policy if exists %I on crm.%I', r.tbl || '_insert', r.tbl);
    execute format(
      'create policy %I on crm.%I for insert to authenticated with check ((select crm.has_any_access(%L::text[], ''write'')))',
      r.tbl || '_insert', r.tbl, r.write_sections);

    execute format('drop policy if exists %I on crm.%I', r.tbl || '_update', r.tbl);
    execute format(
      'create policy %I on crm.%I for update to authenticated using ((select crm.has_any_access(%L::text[], ''write''))) with check ((select crm.has_any_access(%L::text[], ''write'')))',
      r.tbl || '_update', r.tbl, r.write_sections, r.write_sections);

    execute format('drop policy if exists %I on crm.%I', r.tbl || '_delete', r.tbl);
    execute format(
      'create policy %I on crm.%I for delete to authenticated using ((select crm.has_any_access(%L::text[], ''write'')))',
      r.tbl || '_delete', r.tbl, r.write_sections);
  end loop;
end;
$$;

-- ── Tables transverses : lisibles par toute l'équipe (noms, avatars, catalogue, paramètres) ──

-- Équipe : lecture pour tout membre actif ; écriture = section « parametres » (admin).
alter table crm.team_members enable row level security;
drop policy if exists team_members_read on crm.team_members;
create policy team_members_read on crm.team_members for select to authenticated
  using ((select crm.is_team_member()));
drop policy if exists team_members_write on crm.team_members;
create policy team_members_write on crm.team_members for all to authenticated
  using ((select crm.has_access('parametres', 'write')))
  with check ((select crm.has_access('parametres', 'write')));

-- Catalogue d'offres : lecture pour tous (candidatures, devis) ; écriture = parametres.
alter table crm.offers enable row level security;
drop policy if exists offers_read on crm.offers;
create policy offers_read on crm.offers for select to authenticated
  using ((select crm.is_team_member()));
drop policy if exists offers_write on crm.offers;
create policy offers_write on crm.offers for all to authenticated
  using ((select crm.has_access('parametres', 'write')))
  with check ((select crm.has_access('parametres', 'write')));

-- Paramètres (singleton) : lecture pour tous (mentions légales des factures…) ; écriture = parametres.
alter table crm.settings enable row level security;
drop policy if exists settings_read on crm.settings;
create policy settings_read on crm.settings for select to authenticated
  using ((select crm.is_team_member()));
drop policy if exists settings_write on crm.settings;
create policy settings_write on crm.settings for all to authenticated
  using ((select crm.has_access('parametres', 'write')))
  with check ((select crm.has_access('parametres', 'write')));

-- Journal d'activité : lecture et ajout pour tout membre (en son nom) ; journal
-- immuable sauf pour l'admin (purge RGPD).
alter table crm.activities enable row level security;
drop policy if exists activities_read on crm.activities;
create policy activities_read on crm.activities for select to authenticated
  using ((select crm.is_team_member()));
drop policy if exists activities_insert on crm.activities;
create policy activities_insert on crm.activities for insert to authenticated
  with check ((select crm.is_team_member()) and (actor_id is null or actor_id = (select crm.current_member_id())));
drop policy if exists activities_update on crm.activities;
create policy activities_update on crm.activities for update to authenticated
  using ((select crm.has_access('parametres', 'write')))
  with check ((select crm.has_access('parametres', 'write')));
drop policy if exists activities_delete on crm.activities;
create policy activities_delete on crm.activities for delete to authenticated
  using ((select crm.has_access('parametres', 'write')));
