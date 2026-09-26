-- Planificateur du back-office (Supabase Cron = extension pg_cron).
--
-- Une seule tâche récurrente, « crm-scheduler », appelle crm.run_scheduler() chaque
-- minute. run_scheduler() enchaîne les traitements périodiques du CRM ; chacun est
-- isolé : un échec est journalisé (au plus une fois par heure et par traitement)
-- sans bloquer les suivants. Ajouter un traitement = écrire sa fonction puis
-- l'appeler dans run_scheduler() (nouvelle migration).
--
-- Traitements actuels, sur les contenus « planifie » dont l'heure est passée :
--   • crm.publish_due_contents() : contenus que le CRM met lui-même en ligne (article
--     de blog, FAQ — cf. crm.push_content_to_site) → « publie » ; le trigger
--     contents_site_sync les recopie vers le site (visible sous 60 s).
--   • crm.remind_due_contents() : tous les autres (LinkedIn, Instagram, newsletter,
--     pages non synchronisées…) — le CRM ne les publie pas : une tâche de rappel est
--     créée pour l'auteur ; le contenu reste « planifie » jusqu'à ce qu'on le marque
--     publié.
--
-- Seconde tâche, « crm-cron-purge » : pg_cron journalise chaque exécution dans
-- cron.job_run_details sans jamais purger ; on garde 7 jours d'historique.

-- 1. Extension (procédure Supabase : schéma pg_catalog, tables cron accessibles à postgres)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- 2. Contenus mis en ligne par le CRM : publication à l'heure dite
create or replace function crm.publish_due_contents()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r       record;
  v_count integer;
begin
  -- Contenu incomplet pour sa page du site : renvoyé en relecture plutôt que publié
  -- à moitié (l'éditeur l'empêche déjà ; garde-fou pour les autres chemins).
  for r in
    select c.id, c.type
      from crm.contents c
     where c.status = 'planifie'
       and c.scheduled_at <= now()
       and ((c.type = 'faq' and btrim(c.category) = '')
         or (c.type = 'article' and c.channel = 'blog' and btrim(c.slug) = ''))
       for update skip locked
  loop
    update crm.contents set status = 'relecture', updated_at = now() where id = r.id;
    perform crm.log_system('contents', r.id,
      case when r.type = 'faq'
        then 'Publication programmée annulée : catégorie de FAQ manquante (renvoyé en relecture)'
        else 'Publication programmée annulée : slug manquant (renvoyé en relecture)'
      end);
  end loop;

  -- Date de publication = date programmée (celle choisie dans l'éditeur).
  update crm.contents
     set status = 'publie', published_at = scheduled_at, updated_at = now()
   where status = 'planifie'
     and scheduled_at <= now()
     and ((type = 'article' and channel = 'blog') or type = 'faq');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 3. Autres contenus : tâche de rappel à l'heure dite (tâche automatique « Publier
-- sur … » rattachée au contenu). Un seul rappel ouvert par contenu : reprogrammé, le
-- contenu déplace son rappel ouvert à la nouvelle date ; sorti de « planifie »
-- (publié, archivé, repassé en rédaction) ou supprimé, son rappel ouvert est clos.
create or replace function crm.remind_due_contents()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r       record;
  v_where text;
  v_title text;
  v_notes text;
  v_task  text;
  v_count integer := 0;
begin
  update crm.tasks t
     set done_at = now(), updated_at = now()
   where t.automated and t.done_at is null and t.related ->> 'entity' = 'contents'
     and t.title like 'Publier sur %'
     and not exists (select 1 from crm.contents c where c.id = t.related ->> 'id' and c.status = 'planifie');

  -- Reprogrammé plus tard alors que son rappel était déjà ouvert : le rappel suit.
  update crm.tasks t
     set due_at = c.scheduled_at, updated_at = now(),
         notes = format('Publication programmée le %s. Une fois en ligne, passez le contenu en « Publié » dans le CRM.',
                        to_char(c.scheduled_at at time zone 'Europe/Paris', 'DD/MM/YYYY "à" HH24:MI'))
    from crm.contents c
   where t.automated and t.done_at is null and t.related ->> 'entity' = 'contents'
     and t.title like 'Publier sur %'
     and c.id = t.related ->> 'id' and c.status = 'planifie'
     and c.scheduled_at > now() and c.scheduled_at <> t.due_at;

  for r in
    select c.id, c.title, c.channel, c.author_id, c.scheduled_at
      from crm.contents c
     where c.status = 'planifie'
       and c.scheduled_at <= now()
       and not ((c.type = 'article' and c.channel = 'blog') or c.type = 'faq')
       and not exists (
         select 1 from crm.tasks t
          where t.related ->> 'entity' = 'contents' and t.related ->> 'id' = c.id
            and t.automated and t.title like 'Publier sur %' and t.due_at = c.scheduled_at)
  loop
    v_where := case r.channel
      when 'linkedin' then 'LinkedIn' when 'instagram' then 'Instagram'
      when 'newsletter' then 'la newsletter' when 'site' then 'le site' else 'le blog' end;
    v_title := format('Publier sur %s : « %s »', v_where, r.title);
    v_notes := format('Publication programmée le %s. Une fois en ligne, passez le contenu en « Publié » dans le CRM.',
                      to_char(r.scheduled_at at time zone 'Europe/Paris', 'DD/MM/YYYY "à" HH24:MI'));

    update crm.tasks t
       set title = v_title, due_at = r.scheduled_at, notes = v_notes, updated_at = now()
     where t.id = (select t2.id from crm.tasks t2
                    where t2.related ->> 'entity' = 'contents' and t2.related ->> 'id' = r.id
                      and t2.automated and t2.title like 'Publier sur %' and t2.done_at is null
                    order by t2.created_at desc limit 1)
    returning t.id into v_task;

    if v_task is null then
      insert into crm.tasks (title, kind, priority, due_at, assignee_id, related, automated, notes)
      values (v_title, 'admin', 'haute', r.scheduled_at, r.author_id,
              jsonb_build_object('entity', 'contents', 'id', r.id), true, v_notes);
      perform crm.log_system('contents', r.id, format('Rappel de publication créé (%s)', v_where));
    else
      perform crm.log_system('contents', r.id, format('Rappel de publication reporté (%s)', v_where));
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 4. Journal des échecs du planificateur : une trace par traitement et par heure au
-- plus (une panne persistante ne doit pas écrire 1 440 lignes par jour).
create or replace function crm.scheduler_failure(p_step text, p_error text, p_sqlstate text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_summary text := format('Planificateur : échec du traitement « %s »', p_step);
begin
  if not exists (
    select 1 from crm.activities
     where entity = 'automations' and entity_id = 'crm-scheduler'
       and summary = v_summary and at > now() - interval '1 hour'
  ) then
    perform crm.log_system('automations', 'crm-scheduler', v_summary,
      jsonb_build_object('error', p_error, 'sqlstate', p_sqlstate));
  end if;
end;
$$;

-- 5. Point d'entrée de la tâche « crm-scheduler »
create or replace function crm.run_scheduler()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
begin
  begin
    v_result := v_result || jsonb_build_object('contents_published', crm.publish_due_contents());
  exception when others then
    v_result := v_result || jsonb_build_object('contents_published_error', sqlerrm);
    perform crm.scheduler_failure('publication programmée', sqlerrm, sqlstate);
  end;

  begin
    v_result := v_result || jsonb_build_object('contents_reminded', crm.remind_due_contents());
  exception when others then
    v_result := v_result || jsonb_build_object('contents_reminded_error', sqlerrm);
    perform crm.scheduler_failure('rappels de publication', sqlerrm, sqlstate);
  end;

  return v_result;
end;
$$;

revoke execute on function crm.publish_due_contents() from public, anon, authenticated;
revoke execute on function crm.remind_due_contents() from public, anon, authenticated;
revoke execute on function crm.scheduler_failure(text, text, text) from public, anon, authenticated;
revoke execute on function crm.run_scheduler() from public, anon, authenticated;

-- 6. Tâches (cron.schedule met à jour une tâche existante du même nom). Heures en UTC.
select cron.schedule('crm-scheduler', '* * * * *', 'select crm.run_scheduler()');
select cron.schedule('crm-cron-purge', '23 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
