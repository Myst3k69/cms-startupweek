-- ════════════════════════════════════════════════════════════════════════════
-- StartupWeek OS — 3/4 : fonctions métier, synchro CRM → site, vues analytics
--
--  A. Numérotation légale sans trou (factures, devis, réclamations)
--  B. Paiements → factures (paid_cents / statut) → candidatures (amount_paid_cents)
--  C. Places restantes en temps réel + bascule inscriptions_ouvertes ↔ complet
--     (remplace le schedule n8n de 5 min)
--  D. Synchro CRM → site : crm.sessions → public.event ; crm.resources →
--     public.template / public.administrative_resource (+ liaisons). Remplace les
--     workflows n8n « Sync Airtable -> Supabase (polling) », « Create or update
--     Event », « Ressources copy », « add ressources for event(s) ».
--  E. Vues d'analytics (security_invoker : la RLS de l'utilisateur s'applique)
--
-- Toutes les fonctions qui touchent d'autres tables sont SECURITY DEFINER avec
-- search_path vide (objets toujours qualifiés). Les tables du site (public.*)
-- ne sont référencées QUE dans des corps plpgsql, gardés par to_regclass() : la
-- migration s'applique aussi sur une base (ou une branche) sans ces tables.
-- ════════════════════════════════════════════════════════════════════════════

-- ═════════════════════ A. Numérotation légale ═════════════════════

create table if not exists crm.document_counters (
  kind       text not null,          -- invoice | quote | complaint
  year       integer not null,
  last_value integer not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (kind, year)
);
comment on table crm.document_counters is
  'Compteurs de numérotation (factures : séquence continue et sans trou par année, art. 242 nonies A annexe II CGI).';

-- Prochain numéro « PREFIX-AAAA-NNNN ». Verrou de ligne (FOR UPDATE) : deux
-- transactions concurrentes sont sérialisées ; un rollback annule aussi
-- l'incrément → aucun trou (contrairement à une séquence PostgreSQL).
-- À appeler dans la MÊME transaction que l'insertion du document (triggers ci-dessous).
create or replace function crm.next_document_number(p_kind text, p_prefix text, p_pad integer default 4)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from (now() at time zone 'Europe/Paris'))::integer;
  v_next integer;
begin
  insert into crm.document_counters (kind, year, last_value)
  values (p_kind, v_year, 0)
  on conflict (kind, year) do nothing;

  select c.last_value + 1 into v_next
  from crm.document_counters c
  where c.kind = p_kind and c.year = v_year
  for update;

  update crm.document_counters
  set last_value = v_next, updated_at = now()
  where kind = p_kind and year = v_year;

  return format('%s-%s-%s', p_prefix, v_year, lpad(v_next::text, greatest(p_pad, 1), '0'));
end;
$$;

-- Aligne un compteur sur un numéro fourni explicitement (import Airtable, saisie
-- manuelle) pour que la numérotation automatique ne le réattribue jamais.
create or replace function crm.sync_document_counter(p_kind text, p_number text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match text[] := regexp_match(coalesce(p_number, ''), '-(\d{4})-(\d+)$');
begin
  if v_match is null then
    return;
  end if;
  insert into crm.document_counters (kind, year, last_value)
  values (p_kind, v_match[1]::integer, v_match[2]::integer)
  on conflict (kind, year) do update
    set last_value = greatest(crm.document_counters.last_value, excluded.last_value),
        updated_at = now();
end;
$$;

-- Factures : numéro attribué à l'émission (sortie du statut brouillon), jamais
-- modifiable ensuite. Série unique factures + avoirs.
create or replace function crm.tg_invoices_numbering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text;
begin
  if tg_op = 'UPDATE' and old.number <> '' and old.status <> 'brouillon' and new.number is distinct from old.number then
    raise exception 'Facture % : numéro non modifiable après émission (numérotation légale)', old.number
      using errcode = 'check_violation';
  end if;

  if new.status <> 'brouillon' and coalesce(new.number, '') = '' then
    select coalesce(nullif(btrim(s.invoice_prefix), ''), 'F') into v_prefix from crm.settings s limit 1;
    new.number := crm.next_document_number('invoice', coalesce(v_prefix, 'F'), 4);
  elsif coalesce(new.number, '') <> '' and (tg_op = 'INSERT' or new.number is distinct from old.number) then
    perform crm.sync_document_counter('invoice', new.number);
  end if;
  new.number := coalesce(new.number, '');
  return new;
end;
$$;
create trigger invoices_numbering
  before insert or update of number, status on crm.invoices
  for each row execute function crm.tg_invoices_numbering();

-- Une facture émise ne se supprime pas : on émet un avoir.
create or replace function crm.tg_invoices_protect_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'brouillon' or old.number <> '' then
    raise exception 'Facture % émise : suppression interdite, émettre un avoir', old.number
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;
create trigger invoices_protect_delete
  before delete on crm.invoices
  for each row execute function crm.tg_invoices_protect_delete();

-- Devis : numéro attribué dès la création si absent (D-2026-0012).
create or replace function crm.tg_quotes_numbering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text;
begin
  if coalesce(new.number, '') = '' then
    select coalesce(nullif(btrim(s.quote_prefix), ''), 'D') into v_prefix from crm.settings s limit 1;
    new.number := crm.next_document_number('quote', coalesce(v_prefix, 'D'), 4);
  elsif tg_op = 'INSERT' or new.number is distinct from old.number then
    perform crm.sync_document_counter('quote', new.number);
  end if;
  return new;
end;
$$;
create trigger quotes_numbering
  before insert or update of number on crm.quotes
  for each row execute function crm.tg_quotes_numbering();

-- Réclamations : REC-AAAA-NNN (registre Qualiopi ind. 31).
create or replace function crm.tg_complaints_numbering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.number, '') = '' then
    new.number := crm.next_document_number('complaint', 'REC', 3);
  elsif tg_op = 'INSERT' or new.number is distinct from old.number then
    perform crm.sync_document_counter('complaint', new.number);
  end if;
  return new;
end;
$$;
create trigger complaints_numbering
  before insert or update of number on crm.complaints
  for each row execute function crm.tg_complaints_numbering();

-- ═════════════════════ B. Paiements → factures → candidatures ═════════════════════

-- Recalcule paid_cents (somme des paiements réussis, remboursements négatifs
-- inclus) et le statut payee / partielle d'une facture. Source unique de vérité
-- pour Stripe, Qonto et la saisie manuelle.
create or replace function crm.refresh_invoice_payment(p_invoice_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv    crm.invoices;
  v_paid   integer;
  v_total  integer;
  v_status text;
begin
  if p_invoice_id is null then
    return;
  end if;
  select * into v_inv from crm.invoices where id = p_invoice_id for update;
  if not found then
    return;
  end if;

  select coalesce(sum(p.amount_cents), 0)::integer into v_paid
  from crm.payments p
  where p.invoice_id = p_invoice_id and p.status in ('reussi', 'rembourse');

  v_total := crm.lines_total_cents(v_inv.lines);
  v_status := v_inv.status;
  if v_inv.kind <> 'avoir' and v_inv.status not in ('brouillon', 'annulee') then
    if v_total > 0 and v_paid >= v_total then
      v_status := 'payee';
    elsif v_paid > 0 then
      v_status := 'partielle';
    elsif v_inv.status in ('payee', 'partielle') then
      v_status := case when v_inv.due_at < now() then 'en_retard' else 'emise' end;
    end if;
  end if;

  update crm.invoices
  set paid_cents = v_paid, status = v_status
  where id = p_invoice_id and (paid_cents is distinct from v_paid or status is distinct from v_status);

  -- Dénormalisation sur la candidature (listes)
  if v_inv.application_id is not null then
    update crm.applications a
    set amount_paid_cents = coalesce((
      select sum(i.paid_cents)
      from crm.invoices i
      where i.application_id = a.id and i.kind <> 'avoir' and i.status <> 'annulee'
    ), 0)
    where a.id = v_inv.application_id;
  end if;
end;
$$;

create or replace function crm.tg_payments_refresh_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform crm.refresh_invoice_payment(new.invoice_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.invoice_id is distinct from new.invoice_id) then
    perform crm.refresh_invoice_payment(old.invoice_id);
  end if;
  return null;
end;
$$;
create trigger payments_refresh_invoice
  after insert or update or delete on crm.payments
  for each row execute function crm.tg_payments_refresh_invoice();

-- Garde-fou « write-through » : l'interface upsert des lignes complètes, parfois
-- périmées (paid_cents lu avant un paiement Stripe). Dès qu'une facture a des
-- paiements, paid_cents et le statut payée / partielle sont recalculés ici,
-- quelle que soit la valeur envoyée. Sans paiement enregistré (import, saisie
-- manuelle), la valeur fournie est conservée.
create or replace function crm.tg_invoices_payment_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid  integer;
  v_total integer;
begin
  if not exists (select 1 from crm.payments p where p.invoice_id = new.id) then
    return new;
  end if;
  select coalesce(sum(p.amount_cents), 0)::integer into v_paid
  from crm.payments p
  where p.invoice_id = new.id and p.status in ('reussi', 'rembourse');
  new.paid_cents := v_paid;
  if new.kind <> 'avoir' and new.status not in ('brouillon', 'annulee') then
    v_total := crm.lines_total_cents(new.lines);
    if v_total > 0 and v_paid >= v_total then
      new.status := 'payee';
    elsif v_paid > 0 then
      new.status := 'partielle';
    elsif new.status in ('payee', 'partielle') then
      new.status := case when new.due_at < now() then 'en_retard' else 'emise' end;
    end if;
  end if;
  return new;
end;
$$;
create trigger invoices_payment_state
  before update on crm.invoices
  for each row execute function crm.tg_invoices_payment_state();

-- Même garde-fou pour le montant encaissé dénormalisé sur la candidature.
create or replace function crm.tg_applications_paid_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from crm.invoices i where i.application_id = new.id) then
    new.amount_paid_cents := coalesce((
      select sum(i.paid_cents)
      from crm.invoices i
      where i.application_id = new.id and i.kind <> 'avoir' and i.status <> 'annulee'
    ), 0);
  end if;
  return new;
end;
$$;
create trigger applications_paid_state
  before update on crm.applications
  for each row execute function crm.tg_applications_paid_state();

create or replace function crm.tg_invoices_lines_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform crm.refresh_invoice_payment(new.id);
  return null;
end;
$$;
create trigger invoices_lines_changed
  after update of lines on crm.invoices
  for each row when (old.lines is distinct from new.lines)
  execute function crm.tg_invoices_lines_changed();

-- ═════════════════════ C. Places restantes & bascule automatique ═════════════════════

-- Inscrits = candidatures au statut « inscrite » (payée), comme la formule Airtable
-- « Nb places total − candidatures Inscrite (payée) ».
create or replace function crm.session_registered_count(p_session_id text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from crm.applications a
  where a.event_id = p_session_id and a.status = 'inscrite';
$$;

create or replace function crm.session_places_remaining(p_session_id text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(s.capacity - crm.session_registered_count(s.id), 0)
  from crm.sessions s
  where s.id = p_session_id;
$$;

-- Statut après recalcul des places : inscriptions_ouvertes → complet quand il n'y a
-- plus de place ; complet → inscriptions_ouvertes si une place se libère avant la
-- date limite. Les autres statuts ne sont jamais modifiés automatiquement.
create or replace function crm.next_capacity_status(p_status text, p_remaining integer, p_capacity integer, p_deadline timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_status = 'inscriptions_ouvertes' and p_capacity > 0 and p_remaining <= 0 then 'complet'
    when p_status = 'complet' and p_remaining > 0 and (p_deadline is null or p_deadline > now()) then 'inscriptions_ouvertes'
    else p_status
  end;
$$;

-- • Une session ne peut jamais être « inscriptions_ouvertes » sans place libre (y compris
--   si l'interface renvoie un statut périmé) → « complet ».
-- • Capacité modifiée sans changement explicite de statut → bascule automatique dans les
--   deux sens (comme l'ancien schedule n8n : « complet » + place libre → réouverture).
--   Pour fermer les inscriptions alors qu'il reste des places, avancer registration_deadline
--   (aucune réouverture automatique après la date limite).
create or replace function crm.tg_sessions_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining integer;
begin
  if new.status = 'inscriptions_ouvertes'
     or (tg_op = 'UPDATE' and new.status = old.status and new.capacity is distinct from old.capacity) then
    v_remaining := greatest(new.capacity - crm.session_registered_count(new.id), 0);
    new.status := crm.next_capacity_status(new.status, v_remaining, new.capacity, new.registration_deadline);
  end if;
  return new;
end;
$$;
create trigger sessions_capacity
  before insert or update of capacity, status on crm.sessions
  for each row execute function crm.tg_sessions_capacity();

-- Recalcule une session après un mouvement de candidature : bascule de statut
-- (qui déclenche la synchro site) ou, à défaut, simple mise à jour des places sur le site.
create or replace function crm.refresh_session_capacity(p_session_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session crm.sessions;
  v_status  text;
begin
  if p_session_id is null then
    return;
  end if;
  select * into v_session from crm.sessions where id = p_session_id for update;
  if not found then
    return;
  end if;
  v_status := crm.next_capacity_status(
    v_session.status, crm.session_places_remaining(p_session_id), v_session.capacity, v_session.registration_deadline
  );
  if v_status is distinct from v_session.status then
    update crm.sessions set status = v_status where id = p_session_id;   -- → trigger sessions_site_sync
  else
    perform crm.push_session_to_site(p_session_id);
  end if;
end;
$$;

create or replace function crm.tg_applications_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform crm.refresh_session_capacity(new.event_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.event_id is distinct from new.event_id) then
    perform crm.refresh_session_capacity(old.event_id);
  end if;
  return null;
end;
$$;
create trigger applications_capacity
  after insert or delete or update of status, event_id on crm.applications
  for each row execute function crm.tg_applications_capacity();

-- ═════════════════════ D. Synchro CRM → site (schéma public) ═════════════════════

-- Lien entre une ligne CRM et sa copie côté site (ressources : template ou administrative_resource).
create table if not exists crm.site_links (
  entity     text not null,             -- 'resources'
  crm_id     text not null,
  site_table text not null check (site_table in ('template', 'administrative_resource')),
  site_id    uuid not null,
  synced_at  timestamptz not null default now(),
  primary key (entity, crm_id)
);

-- Programme jsonb (ProgramSlot[]) → texte lisible pour public.event.program_details.
create or replace function crm.program_to_text(p_program jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(string_agg(
    btrim(format('J%s · %s–%s · %s', p ->> 'day', p ->> 'start', p ->> 'end', p ->> 'title')),
    E'\n'
    order by case when (p ->> 'day') ~ '^\d+$' then (p ->> 'day')::integer end nulls last, p ->> 'start'
  ), '')
  from jsonb_array_elements(case when jsonb_typeof(p_program) = 'array' then p_program else '[]'::jsonb end) as p;
$$;

-- Journalise un incident de synchro sans jamais bloquer la transaction CRM.
create or replace function crm.log_system(p_entity text, p_entity_id text, p_summary text, p_meta jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into crm.activities (kind, entity, entity_id, summary, meta)
  values ('systeme', p_entity, p_entity_id, p_summary, p_meta);
$$;

-- Upsert d'une session dans public.event (clé event_code). N'écrit QUE les colonnes
-- existantes de public.event (relevées le 26/09/2026) :
--   event_code, title, start_date, end_date, registration_deadline, location, price_cents,
--   total_places, min_places, format, type, status, region, description, image_url,
--   program_details, places_remaining, highlights, public_target_price_cents,
--   founder_edition, early_bird, airtable_record_id, updated_at.
-- Publiée seulement si published_on_site ; une session déjà présente sur le site
-- et dépubliée repasse en « brouillon » (masquée).
create or replace function crm.push_session_to_site(p_session_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s          crm.sessions;
  v_event_id uuid;
  v_is_new   boolean;
  v_status   text;
begin
  if to_regclass('public.event') is null then
    return;
  end if;
  select * into s from crm.sessions where id = p_session_id;
  if not found then
    return;
  end if;

  -- public.event impose event_code ~ '^SW-[0-9]{4}$'
  if s.code !~ '^SW-[0-9]{4}$' then
    if s.published_on_site then
      perform crm.log_system('events', s.id,
        format('Synchro site ignorée : le code « %s » ne respecte pas le format SW-0000', s.code));
    end if;
    return;
  end if;

  select e.id into v_event_id from public.event e where e.event_code = s.code;
  v_is_new := v_event_id is null;
  if v_is_new and not s.published_on_site then
    return;   -- jamais publiée : rien à faire côté site
  end if;

  v_status := case
    when not s.published_on_site then 'brouillon'
    when s.status in ('brouillon', 'prevu') then 'brouillon'
    when s.status in ('inscriptions_ouvertes', 'complet', 'en_cours') then 'publie'
    when s.status = 'termine' then 'termine'
    when s.status = 'annule' then 'annule'
    else 'brouillon'
  end;

  insert into public.event as e (
    event_code, title, start_date, end_date, registration_deadline, location, price_cents,
    total_places, min_places, format, type, status, region, description, image_url,
    program_details, places_remaining, highlights, public_target_price_cents,
    founder_edition, early_bird, airtable_record_id, updated_at
  )
  values (
    s.code,
    s.name,
    (s.start_at at time zone 'Europe/Paris')::date,
    (s.end_at at time zone 'Europe/Paris')::date,
    coalesce((s.registration_deadline at time zone 'Europe/Paris')::date, (s.start_at at time zone 'Europe/Paris')::date - 7),
    coalesce(nullif(btrim(s.city), ''), nullif(btrim(s.venue), ''), case when s.mode = 'distanciel' then 'En ligne' end),
    s.price_cents,
    s.capacity,
    s.min_capacity,
    (case when s.format = 'week_end' then 'week_end' else 'semaine' end)::public.event_format,
    (case when s.mode = 'distanciel' then 'distanciel' else 'presentiel' end)::public.event_type,
    v_status::public.event_status,
    s.region,
    s.description,
    nullif(btrim(coalesce(s.image_url, '')), ''),
    crm.program_to_text(s.program),
    crm.session_places_remaining(s.id),
    s.highlights,
    s.public_price_cents,
    s.founder_edition,
    s.early_bird,
    s.airtable_record_id,
    now()
  )
  on conflict (event_code) do update set
    title                     = excluded.title,
    start_date                = excluded.start_date,
    end_date                  = excluded.end_date,
    registration_deadline     = excluded.registration_deadline,
    location                  = coalesce(excluded.location, e.location),
    price_cents               = excluded.price_cents,
    total_places              = excluded.total_places,
    min_places                = excluded.min_places,
    format                    = excluded.format,
    type                      = excluded.type,
    status                    = excluded.status,
    region                    = excluded.region,
    description               = excluded.description,
    image_url                 = coalesce(excluded.image_url, e.image_url),
    program_details           = coalesce(excluded.program_details, e.program_details),
    places_remaining          = excluded.places_remaining,
    highlights                = excluded.highlights,
    public_target_price_cents = excluded.public_target_price_cents,
    founder_edition           = excluded.founder_edition,
    early_bird                = excluded.early_bird,
    airtable_record_id        = coalesce(e.airtable_record_id, excluded.airtable_record_id),
    updated_at                = now()
  returning e.id into v_event_id;

  -- Première publication : créer les liaisons des ressources déjà rattachées.
  if v_is_new then
    perform crm.push_resource_to_site(r.id)
    from crm.resources r
    where s.id = any (r.event_ids) or r.id = any (s.resource_ids);
  end if;
exception when others then
  perform crm.log_system('events', p_session_id, 'Échec de la synchro vers le site (public.event)',
    jsonb_build_object('error', sqlerrm, 'sqlstate', sqlstate));
end;
$$;

-- Ressources CRM → site. Règles :
--   • visibilité public / participants / premium ET url renseignée → publiée, sinon retirée ;
--   • catégories « modèles » (business_plan, pitch_deck, maquette, financier, digital)
--     → public.template (required_tier = premium si visibilité premium, sinon gratuit) ;
--   • autres catégories (administratif, juridique, pédagogique, qualiopi, autre)
--     → public.administrative_resource + liaisons public.administrative_resource_event
--       reconstruites à chaque synchro (comme « add ressources for event(s) »).
--   NB : n8n n'envoyait vers public.template QUE la catégorie « digital ».
create or replace function crm.remove_resource_from_site(p_resource_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link crm.site_links;
begin
  select * into v_link from crm.site_links where entity = 'resources' and crm_id = p_resource_id;
  if not found then
    return;
  end if;
  begin
    if v_link.site_table = 'administrative_resource' and to_regclass('public.administrative_resource') is not null then
      if to_regclass('public.administrative_resource_event') is not null then
        delete from public.administrative_resource_event where resource_id = v_link.site_id;
      end if;
      delete from public.administrative_resource where id = v_link.site_id;
    elsif v_link.site_table = 'template' and to_regclass('public.template') is not null then
      delete from public.template where id = v_link.site_id;
    end if;
    delete from crm.site_links where entity = 'resources' and crm_id = p_resource_id;
  exception when others then
    -- ex. public.content référence ce template : on le laisse en place et on trace.
    perform crm.log_system('resources', p_resource_id, 'Retrait de la ressource du site impossible',
      jsonb_build_object('error', sqlerrm, 'sqlstate', sqlstate, 'siteTable', v_link.site_table));
  end;
end;
$$;

create or replace function crm.push_resource_to_site(p_resource_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r         crm.resources;
  v_link    crm.site_links;
  v_target  text;
  v_site_id uuid;
begin
  if to_regclass('public.template') is null or to_regclass('public.administrative_resource') is null then
    return;
  end if;
  select * into r from crm.resources where id = p_resource_id;
  if not found then
    perform crm.remove_resource_from_site(p_resource_id);
    return;
  end if;

  v_target := case
    when r.visibility not in ('public', 'participants', 'premium') or btrim(r.url) = '' then null
    when r.category in ('business_plan', 'pitch_deck', 'maquette', 'financier', 'digital') then 'template'
    else 'administrative_resource'
  end;

  select * into v_link from crm.site_links where entity = 'resources' and crm_id = p_resource_id;
  if found and v_link.site_table is distinct from v_target then
    perform crm.remove_resource_from_site(p_resource_id);   -- dépubliée ou changement de table cible
    v_link := null;
  end if;
  if v_target is null then
    return;
  end if;
  v_site_id := v_link.site_id;

  if v_target = 'template' then
    -- Adoption d'une ligne créée par n8n (même enregistrement Airtable)
    if v_site_id is null and r.airtable_record_id is not null then
      select t.id into v_site_id from public.template t where t.airtable_record_id = r.airtable_record_id limit 1;
    end if;
    if v_site_id is not null then
      update public.template set
        name          = r.title,
        description   = r.description,
        file_url      = r.url,
        format        = (case when r.format in ('pdf', 'docx', 'figma', 'notion') then r.format else 'autre' end)::public.template_format,
        category      = r.category::public.template_category,
        required_tier = (case when r.visibility = 'premium' then 'premium' else 'gratuit' end)::public.subscription_tier,
        updated_at    = now()
      where id = v_site_id;
      if not found then
        v_site_id := null;   -- supprimée côté site entre-temps : on recrée
      end if;
    end if;
    if v_site_id is null then
      insert into public.template (name, description, file_url, format, category, required_tier, airtable_record_id)
      values (
        r.title, r.description, r.url,
        (case when r.format in ('pdf', 'docx', 'figma', 'notion') then r.format else 'autre' end)::public.template_format,
        r.category::public.template_category,
        (case when r.visibility = 'premium' then 'premium' else 'gratuit' end)::public.subscription_tier,
        r.airtable_record_id
      )
      returning id into v_site_id;
    end if;
  else
    if v_site_id is null and r.airtable_record_id is not null then
      select a.id into v_site_id from public.administrative_resource a where a.airtable_record_id = r.airtable_record_id limit 1;
    end if;
    if v_site_id is not null then
      update public.administrative_resource set
        title       = r.title,
        description = r.description,
        file_url    = r.url,
        format      = (case when r.format in ('pdf', 'docx', 'xlsx') then r.format else 'autre' end)::public.administrative_document_format,
        category    = (case when r.category = 'juridique' then 'contrat' else 'autre' end)::public.administrative_document_category,
        updated_at  = now()
      where id = v_site_id;
      if not found then
        v_site_id := null;
      end if;
    end if;
    if v_site_id is null then
      insert into public.administrative_resource (title, description, file_url, format, category, status, airtable_record_id)
      values (
        r.title, r.description, r.url,
        (case when r.format in ('pdf', 'docx', 'xlsx') then r.format else 'autre' end)::public.administrative_document_format,
        (case when r.category = 'juridique' then 'contrat' else 'autre' end)::public.administrative_document_category,
        'disponible'::public.administrative_document_status,
        r.airtable_record_id
      )
      returning id into v_site_id;
    end if;

    -- Liaisons ressource ↔ sessions publiées (reconstruction complète)
    if to_regclass('public.administrative_resource_event') is not null then
      delete from public.administrative_resource_event where resource_id = v_site_id;
      insert into public.administrative_resource_event (resource_id, event_id, sort_order)
      select v_site_id, e.id, (row_number() over (order by s.start_at, s.code))::integer - 1
      from crm.sessions s
      join public.event e on e.event_code = s.code
      where s.id = any (r.event_ids) or r.id = any (s.resource_ids);
    end if;
  end if;

  insert into crm.site_links (entity, crm_id, site_table, site_id, synced_at)
  values ('resources', r.id, v_target, v_site_id, now())
  on conflict (entity, crm_id) do update
    set site_table = excluded.site_table, site_id = excluded.site_id, synced_at = now();
exception when others then
  perform crm.log_system('resources', p_resource_id, 'Échec de la synchro de la ressource vers le site',
    jsonb_build_object('error', sqlerrm, 'sqlstate', sqlstate));
end;
$$;

-- Triggers de synchro
create or replace function crm.tg_sessions_site_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res text;
begin
  if tg_op = 'DELETE' then
    if to_regclass('public.event') is not null then
      begin
        update public.event set status = 'brouillon'::public.event_status, updated_at = now()
        where event_code = old.code;
      exception when others then
        perform crm.log_system('events', old.id, 'Échec du masquage de la session supprimée sur le site',
          jsonb_build_object('error', sqlerrm));
      end;
    end if;
    return null;
  end if;

  if tg_op = 'UPDATE' and old.code is distinct from new.code and to_regclass('public.event') is not null then
    -- Changement de code (rare) : l'ancienne fiche site est masquée, la nouvelle créée.
    begin
      update public.event set status = 'brouillon'::public.event_status, updated_at = now()
      where event_code = old.code;
    exception when others then
      null;
    end;
  end if;

  perform crm.push_session_to_site(new.id);

  -- Ressources ajoutées / retirées depuis la fiche session → liaisons à jour
  if tg_op = 'UPDATE' and old.resource_ids is distinct from new.resource_ids then
    for v_res in
      select distinct x from unnest(old.resource_ids || new.resource_ids) as x
    loop
      perform crm.push_resource_to_site(v_res);
    end loop;
  end if;
  return null;
end;
$$;
create trigger sessions_site_sync
  after insert or update or delete on crm.sessions
  for each row execute function crm.tg_sessions_site_sync();

create or replace function crm.tg_resources_site_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform crm.remove_resource_from_site(old.id);
  else
    perform crm.push_resource_to_site(new.id);
  end if;
  return null;
end;
$$;
create trigger resources_site_sync
  after insert or update or delete on crm.resources
  for each row execute function crm.tg_resources_site_sync();

-- Resynchronisation complète à la demande (après import Airtable, ou si un
-- incident « systeme » apparaît dans le journal) : select crm.resync_site();
create or replace function crm.resync_site()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sessions  integer := 0;
  v_resources integer := 0;
  v_id        text;
begin
  for v_id in select id from crm.sessions order by start_at loop
    perform crm.push_session_to_site(v_id);
    v_sessions := v_sessions + 1;
  end loop;
  for v_id in select id from crm.resources loop
    perform crm.push_resource_to_site(v_id);
    v_resources := v_resources + 1;
  end loop;
  return jsonb_build_object('sessions', v_sessions, 'resources', v_resources);
end;
$$;

-- ═════════════════════ E. Vues d'analytics ═════════════════════

-- Remplissage & CA par session. CA = factures émises rattachées à la session
-- (directement ou via la candidature), avoirs déduits, en centimes TTC.
create or replace view crm.v_session_fill
with (security_invoker = true)
as
select
  s.id,
  s.code,
  s.name,
  s.kind,
  s.status,
  s.start_at,
  s.end_at,
  s.capacity,
  s.min_capacity,
  s.price_cents,
  coalesce(a.applications, 0)                                   as applications,
  coalesce(a.accepted, 0)                                       as accepted,
  coalesce(a.registered, 0)                                     as registered,
  coalesce(a.waitlist, 0)                                       as waitlist,
  greatest(s.capacity - coalesce(a.registered, 0), 0)           as places_remaining,
  case when s.capacity > 0
       then round(100.0 * coalesce(a.registered, 0) / s.capacity, 1)
       else 0 end                                               as fill_rate,
  coalesce(a.registered, 0) >= s.min_capacity                   as min_reached,
  coalesce(a.expected_cents, 0)                                 as expected_cents,
  coalesce(i.invoiced_cents, 0)                                 as revenue_cents,
  coalesce(i.paid_cents, 0)                                     as paid_cents,
  s.budget_cents
from crm.sessions s
left join lateral (
  select
    count(*) filter (where ap.status not in ('refusee', 'hors_cible', 'desistee')) as applications,
    count(*) filter (where ap.status in ('acceptee', 'inscrite'))                 as accepted,
    count(*) filter (where ap.status = 'inscrite')                                as registered,
    count(*) filter (where ap.status = 'liste_attente')                           as waitlist,
    sum(ap.amount_due_cents) filter (where ap.status in ('acceptee', 'inscrite')) as expected_cents
  from crm.applications ap
  where ap.event_id = s.id
) as a on true
left join lateral (
  select
    sum(case when inv.kind = 'avoir' then -abs(crm.lines_total_cents(inv.lines)) else crm.lines_total_cents(inv.lines) end) as invoiced_cents,
    sum(inv.paid_cents) as paid_cents
  from crm.invoices inv
  left join crm.applications ap on ap.id = inv.application_id
  where coalesce(inv.event_id, ap.event_id) = s.id
    and inv.status not in ('brouillon', 'annulee')
) as i on true;

-- Pipeline commercial : montant brut et pondéré (montant × probabilité) par étape.
create or replace view crm.v_pipeline
with (security_invoker = true)
as
select
  d.stage,
  array_position(array['nouveau', 'qualification', 'rdv', 'proposition', 'negociation', 'gagne', 'perdu'], d.stage) as stage_order,
  count(*)                                                       as deals,
  coalesce(sum(d.amount_cents), 0)::bigint                       as amount_cents,
  coalesce(sum(round(d.amount_cents * d.probability / 100.0)), 0)::bigint as weighted_cents,
  round(avg(d.probability), 1)                                   as avg_probability,
  count(*) filter (where d.expected_close_at < now() and d.stage not in ('gagne', 'perdu')) as overdue
from crm.deals d
group by d.stage;

-- Balance âgée : une ligne par facture non soldée, montant ventilé par tranche de retard.
create or replace view crm.v_receivables
with (security_invoker = true)
as
with open_invoices as (
  select
    inv.id, inv.number, inv.kind, inv.status, inv.org_id, inv.contact_id, inv.application_id, inv.event_id,
    inv.issued_at, inv.due_at, inv.preferred_method, inv.reminders_sent, inv.last_reminder_at,
    crm.lines_total_cents(inv.lines)                              as total_cents,
    inv.paid_cents,
    crm.lines_total_cents(inv.lines) - inv.paid_cents             as balance_cents,
    greatest(floor(extract(epoch from (now() - inv.due_at)) / 86400), 0)::integer as days_overdue
  from crm.invoices inv
  where inv.kind <> 'avoir'
    and inv.status in ('emise', 'partielle', 'en_retard')
)
select
  o.*,
  case
    when o.due_at >= now()      then 'a_echoir'
    when o.days_overdue <= 30   then '0_30'
    when o.days_overdue <= 60   then '31_60'
    when o.days_overdue <= 90   then '61_90'
    else '90_plus'
  end as bucket,
  case when o.due_at >= now() then o.balance_cents else 0 end                                   as not_due_cents,
  case when o.due_at < now() and o.days_overdue <= 30 then o.balance_cents else 0 end           as d0_30_cents,
  case when o.days_overdue between 31 and 60 then o.balance_cents else 0 end                    as d31_60_cents,
  case when o.days_overdue between 61 and 90 then o.balance_cents else 0 end                    as d61_90_cents,
  case when o.days_overdue > 90 then o.balance_cents else 0 end                                 as d90_plus_cents
from open_invoices o
where o.balance_cents > 0;

-- Préparation à l'audit Qualiopi : score par critère = (conformes + ½ partiels) / applicables.
create or replace view crm.v_qualiopi_readiness
with (security_invoker = true)
as
select
  c.criterion,
  c.title                                                           as criterion_title,
  count(i.id)                                                       as indicators,
  count(i.id) filter (where i.status <> 'non_applicable')           as applicable,
  count(i.id) filter (where i.status = 'conforme')                  as conforme,
  count(i.id) filter (where i.status = 'partiel')                   as partiel,
  count(i.id) filter (where i.status = 'non_conforme')              as non_conforme,
  count(i.id) filter (where i.status = 'a_faire')                   as a_faire,
  count(i.id) filter (where i.status = 'non_applicable')            as non_applicable,
  count(i.id) filter (where i.newcomer_deferred)                    as newcomer_deferred,
  coalesce(sum(e.evidences), 0)::integer                            as evidences,
  case
    when count(i.id) filter (where i.status <> 'non_applicable') = 0 then 100
    else round(100.0 * (
      count(i.id) filter (where i.status = 'conforme') + 0.5 * count(i.id) filter (where i.status = 'partiel')
    ) / count(i.id) filter (where i.status <> 'non_applicable'))
  end::integer                                                      as score
from (values
  (1, 'Information du public'),
  (2, 'Objectifs & conception'),
  (3, 'Accueil & suivi'),
  (4, 'Moyens'),
  (5, 'Compétences des intervenants'),
  (6, 'Environnement professionnel'),
  (7, 'Appréciations & réclamations')
) as c (criterion, title)
left join crm.qualiopi_indicators i on i.criterion = c.criterion
left join (
  select ev.indicator_code, count(*) as evidences
  from crm.qualiopi_evidences ev
  group by ev.indicator_code
) as e on e.indicator_code = i.code
group by c.criterion, c.title;

-- Entonnoir mensuel (Europe/Paris) : demandes → candidatures → entretiens → inscrites.
-- Cohortes : demandes par mois de réception, candidatures par mois de soumission.
create or replace view crm.v_funnel
with (security_invoker = true)
as
with subs as (
  select
    date_trunc('month', s.received_at at time zone 'Europe/Paris')::date as month,
    count(*)                                                as submissions,
    count(*) filter (where s.type = 'candidature')           as candidature_submissions
  from crm.submissions s
  where s.status <> 'spam'
  group by 1
),
apps as (
  select
    date_trunc('month', a.submitted_at at time zone 'Europe/Paris')::date as month,
    count(*)                                                                         as applications,
    count(*) filter (where a.status in ('qualifiee', 'entretien', 'acceptee', 'inscrite') or a.interview_at is not null) as qualified,
    count(*) filter (where a.interview_at is not null or a.status in ('entretien', 'acceptee', 'inscrite')) as interviews,
    count(*) filter (where a.status in ('acceptee', 'inscrite'))                     as accepted,
    count(*) filter (where a.status = 'inscrite')                                    as registered
  from crm.applications a
  group by 1
)
select
  coalesce(subs.month, apps.month)          as month,
  coalesce(subs.submissions, 0)             as submissions,
  coalesce(subs.candidature_submissions, 0) as candidature_submissions,
  coalesce(apps.applications, 0)            as applications,
  coalesce(apps.qualified, 0)               as qualified,
  coalesce(apps.interviews, 0)              as interviews,
  coalesce(apps.accepted, 0)                as accepted,
  coalesce(apps.registered, 0)              as registered
from subs
full outer join apps on apps.month = subs.month;

-- ═════════════════════ Droits ═════════════════════

-- Tables techniques : aucun accès direct (fonctions SECURITY DEFINER / service_role uniquement).
alter table crm.document_counters enable row level security;
alter table crm.site_links enable row level security;
revoke all on crm.document_counters, crm.site_links from authenticated;
grant all on crm.document_counters, crm.site_links to service_role;

-- Vues : lecture (la RLS des tables sous-jacentes s'applique via security_invoker).
revoke insert, update, delete on crm.v_session_fill, crm.v_pipeline, crm.v_receivables, crm.v_qualiopi_readiness, crm.v_funnel from authenticated;
grant select on crm.v_session_fill, crm.v_pipeline, crm.v_receivables, crm.v_qualiopi_readiness, crm.v_funnel to authenticated, service_role;

-- Fonctions : PostgreSQL accorde EXECUTE à PUBLIC par défaut. On retire tout, puis on
-- ne ré-ouvre à l'équipe que les fonctions de lecture / nécessaires aux policies, vues
-- et triggers non SECURITY DEFINER. Indispensable : un membre authentifié ne doit pas
-- pouvoir appeler crm.next_document_number() en RPC (ce qui créerait des trous).
-- (Les fonctions trigger n'ont pas besoin d'EXECUTE au moment du déclenchement.)
revoke execute on all functions in schema crm from public, anon, authenticated;
grant execute on function
  crm.current_member_id(), crm.current_role(), crm.section_access(text, text),
  crm.has_access(text, text), crm.has_any_access(text[], text), crm.is_team_member(),
  crm.normalize_name(text), crm.lines_total_cents(jsonb), crm.program_to_text(jsonb),
  crm.session_places_remaining(text), crm.session_registered_count(text)
to authenticated;
grant execute on all functions in schema crm to service_role;
