-- Mesure d'audience du site, sans cookie, écrite directement dans le CRM.
--
-- Le site (startupweek.tech) appelle crm.track_site_event() depuis sa route serveur
-- /api/event (clé secrète → service_role) à chaque page vue, clic dans un article,
-- premier champ de formulaire touché et formulaire envoyé. La fonction alimente :
--   • crm.traffic_days        : visiteurs, pages vues, sources, formulaires (par jour) ;
--   • crm.content_stats_days  : vues, lecteurs, clics, leads et sources par article
--                               du blog et par jour (nouvelle table).
-- crm.contents n'est jamais modifié ici : chaque UPDATE de contents déclencherait la
-- recopie vers le site (contents_site_sync) et changerait « modifié le ». La colonne
-- contents.metrics reste la saisie manuelle (posts LinkedIn / Instagram, newsletter) ;
-- le CRM affiche saisie manuelle + mesure.
--
-- Vie privée (aucun cookie, aucun stockage sur l'appareil) :
--   • un visiteur = empreinte sha256(sel du jour | IP | user-agent), calculée ici ;
--     IP et user-agent ne sont jamais enregistrés ;
--   • le sel est aléatoire, propre à chaque jour, et supprimé avec les empreintes
--     après 48 h (tâche « crm-site-visitors-purge ») : passé ce délai, plus rien ne
--     permet de relier une empreinte à une personne ; seuls restent des compteurs ;
--   • un lead est attribué au dernier article lu par la même empreinte (le jour même
--     ou la veille) : seul le compteur de l'article augmente, rien n'est rattaché à
--     la fiche contact.

-- 1. Statistiques quotidiennes par contenu (articles du blog)
create table if not exists crm.content_stats_days (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  content_id  text not null references crm.contents (id) on delete cascade,
  date        date not null,
  views       integer not null default 0 check (views >= 0),
  visitors    integer not null default 0 check (visitors >= 0),   -- lecteurs uniques du jour
  clicks      integer not null default 0 check (clicks >= 0),     -- clics sur un lien de l'article
  leads       integer not null default 0 check (leads >= 0),      -- formulaires envoyés après lecture
  sources     jsonb not null default '{}'::jsonb,                 -- lecteurs par source (clés de traffic_days.sources)
  constraint content_stats_days_content_date_key unique (content_id, date)
);
create index if not exists content_stats_days_date_idx on crm.content_stats_days (date);

create or replace trigger set_updated_at before update on crm.content_stats_days
  for each row execute function crm.tg_set_updated_at();

-- Lecture : sections Contenus et Analytics. Aucune écriture depuis l'interface
-- (pas de policy insert / update / delete) : seul le site, via la fonction, écrit.
alter table crm.content_stats_days enable row level security;
revoke insert, update, delete on crm.content_stats_days from authenticated;
drop policy if exists content_stats_days_read on crm.content_stats_days;
create policy content_stats_days_read on crm.content_stats_days for select to authenticated
  using ((select crm.has_any_access(array['contenus', 'analytics']::text[], 'read')));

-- 2. Empreintes du jour (dédoublonnage des visiteurs) et sels quotidiens — 48 h max
create table if not exists crm.site_salts (
  day   date primary key,
  salt  text not null
);

create table if not exists crm.site_visitors (
  day              date not null,
  hash             text not null,
  first_source     text not null,                 -- source de la première visite du jour
  content_ids      text[] not null default '{}',  -- articles déjà lus ce jour (lecteurs uniques)
  last_content_id  text,                          -- dernier article lu (attribution des leads)
  primary key (day, hash)
);

alter table crm.site_salts enable row level security;
alter table crm.site_visitors enable row level security;
revoke all on crm.site_salts, crm.site_visitors from anon, authenticated;

-- 3. Fonctions
create or replace function crm.jsonb_increment(p_obj jsonb, p_key text, p_by integer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_set(coalesce(p_obj, '{}'::jsonb), array[p_key],
                   to_jsonb(coalesce((p_obj ->> p_key)::integer, 0) + p_by), true);
$$;

-- Source d'une visite : UTM d'abord, sinon domaine référent, sinon « direct ».
-- Clés identiques à TrafficDay.sources (src/lib/domain/types.ts).
create or replace function crm.classify_traffic_source(p_referrer_host text, p_utm_source text, p_utm_medium text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  s text := lower(btrim(coalesce(p_utm_source, '')));
  m text := lower(btrim(coalesce(p_utm_medium, '')));
  h text := regexp_replace(lower(btrim(coalesce(p_referrer_host, ''))), '^(www|m|l|lm)\.', '');
begin
  if s <> '' or m <> '' then
    if m in ('email', 'e-mail', 'mail', 'newsletter') or s like '%newsletter%'
       or s in ('email', 'brevo', 'sendinblue', 'mailchimp', 'resend') then
      return 'newsletter';
    end if;
    if s like 'meta%' or s like '%_ads'
       or (s in ('facebook', 'fb', 'instagram', 'ig')
           and m ~ '(cpc|ppc|paid|ads?$|display|sponsored)') then
      return 'meta_ads';
    end if;
    if s like 'linkedin%' or s = 'lnkd' then return 'linkedin'; end if;
    if s like 'instagram%' or s = 'ig' then return 'instagram'; end if;
    if s like 'google%' or s in ('bing', 'duckduckgo', 'qwant', 'ecosia', 'yahoo', 'brave') then return 'google'; end if;
    return 'partenaires';
  end if;

  if h = '' then return 'direct'; end if;
  if h like '%linkedin%' or h = 'lnkd.in' then return 'linkedin'; end if;
  if h like '%instagram%' then return 'instagram'; end if;
  if h in ('mail.google.com', 'com.google.android.gm') or h ~ '^(mail|webmail|outlook)\.' then return 'newsletter'; end if;
  if h ~ '(^|\.)google\.' or h like '%googlequicksearchbox%'
     or h ~ '(^|\.)(bing\.com|duckduckgo\.com|qwant\.com|ecosia\.org|yahoo\.com|search\.brave\.com|startpage\.com)$' then
    return 'google';
  end if;
  return 'partenaires';
end;
$$;

-- Empreinte d'un visiteur pour un sel donné (IP et user-agent ne sont jamais stockés).
create or replace function crm.site_visitor_hash(p_salt text, p_ip text, p_user_agent text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(
    p_salt || '|' || left(coalesce(p_ip, ''), 64) || '|' || left(coalesce(p_user_agent, ''), 512), 'UTF8')), 'hex');
$$;

-- Point d'entrée appelé par le site. Renvoie ce qui a été compté (tests, journaux).
create or replace function crm.track_site_event(
  p_kind          text,
  p_path          text,
  p_ip            text,
  p_user_agent    text,
  p_referrer_host text default null,
  p_utm_source    text default null,
  p_utm_medium    text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day       date := (now() at time zone 'Europe/Paris')::date;
  v_path      text := left(btrim(coalesce(p_path, '')), 512);
  v_salt      text;
  v_hash      text;
  v_source    text;
  v_new       boolean;
  v_first     text;
  v_read      text[];
  v_content   text;
  v_reader    boolean;
begin
  if p_kind not in ('pageview', 'click', 'form_start', 'form_submit') or v_path not like '/%' then
    return 'ignored';
  end if;

  insert into crm.site_salts (day, salt)
  values (v_day, gen_random_uuid()::text || gen_random_uuid()::text)
  on conflict (day) do nothing;
  select salt into v_salt from crm.site_salts where day = v_day;
  v_hash := crm.site_visitor_hash(v_salt, p_ip, p_user_agent);

  -- Article du blog affiché (slug actuellement publié → contenu du CRM)
  if v_path ~ '^/blog/[^/]+$' then
    select b.crm_id into v_content from public.blog_post b where b.slug = substring(v_path from 7);
  end if;

  if p_kind = 'pageview' then
    v_source := crm.classify_traffic_source(p_referrer_host, p_utm_source, p_utm_medium);

    insert into crm.site_visitors as v (day, hash, first_source)
    values (v_day, v_hash, v_source)
    on conflict (day, hash) do update set first_source = v.first_source   -- verrouille la ligne
    returning (xmax = 0), v.first_source, v.content_ids into v_new, v_first, v_read;

    insert into crm.traffic_days as t (date, visitors, pageviews, sources)
    values (v_day, case when v_new then 1 else 0 end, 1,
            case when v_new then jsonb_build_object(v_first, 1) else '{}'::jsonb end)
    on conflict (date) do update set
      visitors  = t.visitors + excluded.visitors,
      pageviews = t.pageviews + 1,
      sources   = case when v_new then crm.jsonb_increment(t.sources, v_first, 1) else t.sources end;

    if v_content is not null then
      v_reader := not (v_content = any (v_read));
      update crm.site_visitors
         set last_content_id = v_content,
             content_ids = case when v_reader and cardinality(content_ids) < 500 then content_ids || v_content else content_ids end
       where day = v_day and hash = v_hash;

      insert into crm.content_stats_days as c (content_id, date, views, visitors, sources)
      values (v_content, v_day, 1, case when v_reader then 1 else 0 end,
              case when v_reader then jsonb_build_object(v_first, 1) else '{}'::jsonb end)
      on conflict (content_id, date) do update set
        views    = c.views + 1,
        visitors = c.visitors + excluded.visitors,
        sources  = case when v_reader then crm.jsonb_increment(c.sources, v_first, 1) else c.sources end;
      return 'pageview:content';
    end if;
    return 'pageview';

  elsif p_kind = 'click' then
    if v_content is null then return 'ignored'; end if;
    insert into crm.content_stats_days as c (content_id, date, clicks)
    values (v_content, v_day, 1)
    on conflict (content_id, date) do update set clicks = c.clicks + 1;
    return 'click:content';

  elsif p_kind = 'form_start' then
    insert into crm.traffic_days as t (date, form_starts)
    values (v_day, 1)
    on conflict (date) do update set form_starts = t.form_starts + 1;
    return 'form_start';

  else -- form_submit
    insert into crm.traffic_days as t (date, form_submits)
    values (v_day, 1)
    on conflict (date) do update set form_submits = t.form_submits + 1;

    -- Lead attribué au dernier article lu aujourd'hui, sinon hier (sel de la veille).
    select last_content_id into v_content from crm.site_visitors where day = v_day and hash = v_hash;
    if v_content is null then
      select salt into v_salt from crm.site_salts where day = v_day - 1;
      if v_salt is not null then
        select last_content_id into v_content
          from crm.site_visitors
         where day = v_day - 1
           and hash = crm.site_visitor_hash(v_salt, p_ip, p_user_agent);
      end if;
    end if;
    if v_content is not null and exists (select 1 from crm.contents where id = v_content) then
      insert into crm.content_stats_days as c (content_id, date, leads)
      values (v_content, v_day, 1)
      on conflict (content_id, date) do update set leads = c.leads + 1;
      return 'form_submit:lead';
    end if;
    return 'form_submit';
  end if;
end;
$$;

-- Purge des empreintes et des sels de plus de 48 h (jour courant et veille conservés).
create or replace function crm.purge_site_visitors()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from crm.site_visitors where day < (now() at time zone 'Europe/Paris')::date - 1;
  delete from crm.site_salts where day < (now() at time zone 'Europe/Paris')::date - 1;
$$;

revoke execute on function crm.jsonb_increment(jsonb, text, integer) from public, anon, authenticated;
revoke execute on function crm.classify_traffic_source(text, text, text) from public, anon, authenticated;
revoke execute on function crm.site_visitor_hash(text, text, text) from public, anon, authenticated;
revoke execute on function crm.track_site_event(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function crm.purge_site_visitors() from public, anon, authenticated;
grant execute on function crm.track_site_event(text, text, text, text, text, text, text) to service_role;

-- 4. Tâche horaire (heure UTC) : l'empreinte d'une visite ne dépasse jamais 48 h + 1 h.
select cron.schedule('crm-site-visitors-purge', '17 * * * *', 'select crm.purge_site_visitors()');
