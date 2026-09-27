-- Marketing : campagnes publicitaires (Meta, LinkedIn), statistiques synchronisées
-- par l'API des régies, A/B tests (créas, pages du site, emails).
--
-- Traduction de src/lib/domain/types.ts (AdCampaign, AdStatDay, Experiment) :
--   • crm.ad_campaigns : campagne + ses publicités (creatives jsonb, clés camelCase).
--     Clé de synchro (platform, external_id). utm_campaign = clé d'attribution relue
--     sur crm.applications.utm / crm.submissions.utm.
--   • crm.ad_stats : une ligne par jour, par campagne et par publicité. Écrites
--     UNIQUEMENT par l'API serveur (/api/ads/sync, clé secrète) : lecture seule pour
--     l'équipe (même principe que crm.traffic_days, mais sans écriture manuelle).
--   • crm.experiments : A/B tests ; variants jsonb [{id, key, name, description,
--     creativeId?, weight, exposures, conversions}].
--   • crm.experiment_hits : une ligne par visiteur et par test du site (dédoublonnage
--     des expositions / conversions). Serveur uniquement.
--   • crm.track_experiment() : appelée par /api/experiments (service_role) — compte
--     une exposition ou une conversion, au plus une fois par visiteur, de façon atomique.
--   • Nouvelle section de droits « marketing » : admin et commercial en écriture,
--     pédagogie et lecture seule en consultation (miroir de src/lib/auth/permissions.ts).
--     crm.section_access() et activities_entity_check reprennent À L'IDENTIQUE ce
--     qu'a posé la migration Academy (20260926220123) et y ajoutent le marketing :
--     toute migration ultérieure qui les redéfinit doit conserver les deux.

-- 1. Campagnes
create table if not exists crm.ad_campaigns (
  id                 text primary key default gen_random_uuid()::text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  name               text not null,
  platform           text not null check (platform in ('meta', 'linkedin')),
  external_id        text,                                    -- id de la campagne dans la régie
  objective          text not null default 'conversions' check (objective in ('notoriete', 'trafic', 'leads', 'conversions', 'retargeting')),
  status             text not null default 'brouillon' check (status in ('brouillon', 'active', 'en_pause', 'terminee')),
  event_id           text references crm.sessions (id) on delete set null,
  audience           text not null default '',
  start_at           timestamptz not null default now(),
  end_at             timestamptz,
  budget_cents       integer not null default 0 check (budget_cents >= 0),
  daily_budget_cents integer check (daily_budget_cents >= 0),
  utm_campaign       text not null default '',
  landing_url        text not null default '',
  creatives          jsonb not null default '[]'::jsonb check (jsonb_typeof(creatives) = 'array'),
  owner_id           text references crm.team_members (id) on delete set null,
  notes              text,
  last_synced_at     timestamptz,
  constraint ad_campaigns_external_key unique (platform, external_id)
);
create index if not exists ad_campaigns_event_idx on crm.ad_campaigns (event_id);
create index if not exists ad_campaigns_status_idx on crm.ad_campaigns (status, start_at desc);
create index if not exists ad_campaigns_utm_idx on crm.ad_campaigns (lower(utm_campaign));

-- 2. Statistiques quotidiennes (synchro des régies)
create table if not exists crm.ad_stats (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  campaign_id  text not null references crm.ad_campaigns (id) on delete cascade,
  creative_id  text,                                          -- AdCreative.id (null = total campagne)
  date         date not null,
  spend_cents  integer not null default 0 check (spend_cents >= 0),
  impressions  integer not null default 0 check (impressions >= 0),
  clicks       integer not null default 0 check (clicks >= 0),
  leads        integer not null default 0 check (leads >= 0),
  constraint ad_stats_day_key unique nulls not distinct (campaign_id, creative_id, date)
);
create index if not exists ad_stats_date_idx on crm.ad_stats (date);

-- 3. A/B tests
create table if not exists crm.experiments (
  id                    text primary key default gen_random_uuid()::text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  name                  text not null,
  key                   text not null check (key ~ '^[a-z0-9][a-z0-9_-]{1,62}$'),
  hypothesis            text not null default '',
  channel               text not null check (channel in ('publicite', 'site', 'email')),
  status                text not null default 'brouillon' check (status in ('brouillon', 'en_cours', 'termine', 'abandonne')),
  metric                text not null check (metric in ('ctr', 'taux_lead', 'conversion', 'ouverture', 'clic')),
  event_id              text references crm.sessions (id) on delete set null,
  campaign_id           text references crm.ad_campaigns (id) on delete set null,
  template_id           text references crm.email_templates (id) on delete set null,
  page_url              text,
  variants              jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  confidence_target     integer not null default 95 check (confidence_target between 80 and 99),
  min_detectable_effect integer not null default 20 check (min_detectable_effect between 1 and 500),
  start_at              timestamptz,
  end_at                timestamptz,
  winner_key            text,
  conclusion            text,
  owner_id              text references crm.team_members (id) on delete set null,
  constraint experiments_key_key unique (key)
);
create index if not exists experiments_status_idx on crm.experiments (channel, status);

-- Compteurs d'un test du site : alimentés par crm.track_experiment() uniquement. Une
-- modification depuis l'interface (renommer une variante, conclure…) conserve les
-- compteurs enregistrés en base au lieu de les écraser par ceux, périmés, du navigateur.
create or replace function crm.tg_experiments_keep_counts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.channel = 'site' and crm.current_member_id() is not null and new.variants is distinct from old.variants then
    new.variants := coalesce((
      select jsonb_agg(
               case when o.v is null then n.v
                    else n.v || jsonb_build_object('exposures', coalesce(o.v -> 'exposures', '0'::jsonb),
                                                   'conversions', coalesce(o.v -> 'conversions', '0'::jsonb))
               end
               order by n.ord)
        from jsonb_array_elements(new.variants) with ordinality as n (v, ord)
        left join lateral (
          select x.v from jsonb_array_elements(old.variants) as x (v) where x.v ->> 'key' = n.v ->> 'key' limit 1
        ) as o on true
    ), '[]'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists experiments_keep_counts on crm.experiments;
create trigger experiments_keep_counts before update of variants on crm.experiments
  for each row execute function crm.tg_experiments_keep_counts();

-- 4. Expositions / conversions des tests du site (dédoublonnées par visiteur)
create table if not exists crm.experiment_hits (
  experiment_id text not null references crm.experiments (id) on delete cascade,
  visitor_id    text not null check (char_length(visitor_id) between 8 and 100),
  variant_key   text not null,
  exposed_at    timestamptz not null default now(),
  converted_at  timestamptz,
  primary key (experiment_id, visitor_id)
);

-- p_event : 'exposure' | 'conversion'. Retour : { ok, counted, reason? }.
create or replace function crm.track_experiment(p_key text, p_visitor text, p_variant text, p_event text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e        crm.experiments;
  v_key    text;
  v_field  text;
  v_rows   integer;
begin
  select * into e from crm.experiments where key = p_key;
  if not found then
    return jsonb_build_object('ok', false, 'counted', false, 'reason', 'unknown_experiment');
  end if;
  if e.channel <> 'site' or e.status <> 'en_cours' then
    return jsonb_build_object('ok', true, 'counted', false, 'reason', 'not_running');
  end if;

  if p_event = 'exposure' then
    if not exists (select 1 from jsonb_array_elements(e.variants) as x (v) where x.v ->> 'key' = p_variant) then
      return jsonb_build_object('ok', false, 'counted', false, 'reason', 'unknown_variant');
    end if;
    insert into crm.experiment_hits (experiment_id, visitor_id, variant_key)
    values (e.id, p_visitor, p_variant)
    on conflict (experiment_id, visitor_id) do nothing;
    get diagnostics v_rows = row_count;
    v_key := p_variant;
    v_field := 'exposures';
  elsif p_event = 'conversion' then
    -- La variante comptée est celle vue par le visiteur (pas celle annoncée par l'appel).
    update crm.experiment_hits
       set converted_at = now()
     where experiment_id = e.id and visitor_id = p_visitor and converted_at is null
    returning variant_key into v_key;
    get diagnostics v_rows = row_count;
    v_field := 'conversions';
  else
    return jsonb_build_object('ok', false, 'counted', false, 'reason', 'unknown_event');
  end if;

  if v_rows = 0 then
    return jsonb_build_object('ok', true, 'counted', false, 'reason', 'duplicate');
  end if;

  -- Incrément atomique : l'UPDATE relit la ligne verrouillée (READ COMMITTED).
  update crm.experiments x
     set variants = (
           select jsonb_agg(
                    case when t.v ->> 'key' = v_key
                         then jsonb_set(t.v, array[v_field], to_jsonb(coalesce((t.v ->> v_field)::integer, 0) + 1))
                         else t.v
                    end
                    order by t.ord)
             from jsonb_array_elements(x.variants) with ordinality as t (v, ord)
         ),
         updated_at = now()
   where x.id = e.id;

  return jsonb_build_object('ok', true, 'counted', true);
end;
$$;

-- 5. Journal d'activité : nouvelles entités
alter table crm.activities drop constraint if exists activities_entity_check;
alter table crm.activities add constraint activities_entity_check check (entity in (
  'users', 'organizations', 'contacts', 'submissions', 'deals', 'tasks', 'sequences', 'emailTemplates', 'emails',
  'events', 'speakers', 'applications', 'projects', 'attendances', 'evaluations', 'complaints', 'indicators',
  'evidences', 'improvementActions', 'watchItems', 'quotes', 'invoices', 'payments', 'bankTransactions',
  'resources', 'contents', 'automations', 'offers',
  'courses', 'courseModules', 'lessons', 'academyPaths', 'enrollments', 'lessonProgress', 'assignments',
  'learnerConnections', 'cohorts',
  'adCampaigns', 'experiments'));

drop trigger if exists audit_ad_campaigns on crm.ad_campaigns;
create trigger audit_ad_campaigns after insert or update of status on crm.ad_campaigns
  for each row execute function crm.tg_audit('adCampaigns', 'status', 'Campagne créée', 'Statut');
drop trigger if exists audit_experiments on crm.experiments;
create trigger audit_experiments after insert or update of status on crm.experiments
  for each row execute function crm.tg_audit('experiments', 'status', 'Test A/B créé', 'Statut');

-- updated_at automatique
create or replace trigger set_updated_at before update on crm.ad_campaigns
  for each row execute function crm.tg_set_updated_at();
create or replace trigger set_updated_at before update on crm.ad_stats
  for each row execute function crm.tg_set_updated_at();
create or replace trigger set_updated_at before update on crm.experiments
  for each row execute function crm.tg_set_updated_at();

-- 6. Droits : section « marketing » (copie conforme de PERMISSIONS, src/lib/auth/permissions.ts ;
--    section « academy » de la migration 20260926220123 conservée telle quelle)
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
        'sessions', 'intervenants', 'qualiopi', 'facturation', 'ressources', 'contenus', 'academy', 'marketing', 'analytics', 'automatisations', 'parametres'
      ]) then 'write' else 'none' end
    when p_role = 'commercial' then
      case
        when p_section = any (array['dashboard', 'demandes', 'contacts', 'organisations', 'pipeline', 'relances', 'emails', 'candidatures', 'facturation', 'marketing']) then 'write'
        when p_section = any (array['projets', 'sessions', 'intervenants', 'qualiopi', 'ressources', 'contenus', 'academy', 'analytics', 'automatisations']) then 'read'
        else 'none'
      end
    when p_role = 'pedagogie' then
      case
        when p_section = any (array['dashboard', 'relances', 'emails', 'candidatures', 'projets', 'sessions', 'intervenants', 'qualiopi', 'ressources', 'contenus', 'academy']) then 'write'
        when p_section = any (array['demandes', 'contacts', 'organisations', 'pipeline', 'facturation', 'marketing', 'analytics', 'automatisations']) then 'read'
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
          'sessions', 'intervenants', 'qualiopi', 'facturation', 'ressources', 'contenus', 'academy', 'marketing', 'analytics', 'automatisations'
        ]) then 'read'
        else 'none'
      end
    else 'none'
  end;
$$;

-- 7. RLS
alter table crm.ad_campaigns enable row level security;
alter table crm.ad_stats enable row level security;
alter table crm.experiments enable row level security;
alter table crm.experiment_hits enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['ad_campaigns', 'experiments'] loop
    execute format('drop policy if exists %I on crm.%I', t || '_read', t);
    execute format('create policy %I on crm.%I for select to authenticated using ((select crm.has_access(''marketing'', ''read'')))', t || '_read', t);
    execute format('drop policy if exists %I on crm.%I', t || '_insert', t);
    execute format('create policy %I on crm.%I for insert to authenticated with check ((select crm.has_access(''marketing'', ''write'')))', t || '_insert', t);
    execute format('drop policy if exists %I on crm.%I', t || '_update', t);
    execute format('create policy %I on crm.%I for update to authenticated using ((select crm.has_access(''marketing'', ''write''))) with check ((select crm.has_access(''marketing'', ''write'')))', t || '_update', t);
    execute format('drop policy if exists %I on crm.%I', t || '_delete', t);
    execute format('create policy %I on crm.%I for delete to authenticated using ((select crm.has_access(''marketing'', ''write'')))', t || '_delete', t);
  end loop;
end;
$$;

-- Statistiques : lecture seule pour l'équipe (écrites par la synchro serveur).
drop policy if exists ad_stats_read on crm.ad_stats;
create policy ad_stats_read on crm.ad_stats for select to authenticated
  using ((select crm.has_access('marketing', 'read')));
revoke insert, update, delete on crm.ad_stats from authenticated;

-- Visites des tests : serveur uniquement (aucune policy, aucun droit pour l'équipe).
revoke all on crm.experiment_hits from public, anon, authenticated;
grant all on crm.experiment_hits to service_role;

-- section_access() est remplacée (CREATE OR REPLACE conserve ses droits) : on les réaffirme par sécurité.
revoke execute on function crm.section_access(text, text) from public, anon;
grant execute on function crm.section_access(text, text) to authenticated, service_role;

-- 8. Fonctions : exécution réservée au serveur
revoke execute on function crm.track_experiment(text, text, text, text) from public, anon, authenticated;
grant execute on function crm.track_experiment(text, text, text, text) to service_role;
revoke execute on function crm.tg_experiments_keep_counts() from public, anon, authenticated;
