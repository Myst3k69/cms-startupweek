-- Planificateur du back-office (Supabase Cron = extension pg_cron).
--
-- Une seule tâche récurrente, « crm-scheduler », appelle crm.run_scheduler() chaque
-- minute. run_scheduler() enchaîne les traitements périodiques du CRM ; chacun est
-- isolé : un échec est journalisé (au plus une fois par heure) sans bloquer les
-- suivants. Ajouter un traitement = écrire sa fonction puis l'appeler dans
-- run_scheduler() (nouvelle migration).
--
-- Traitement actuel :
--   • crm.publish_due_contents() : les contenus « planifie » dont l'heure est passée
--     passent en « publie » ; le trigger contents_site_sync les recopie vers le site
--     (visible sous 60 s, revalidation du site).
--
-- Seconde tâche, « crm-cron-purge » : pg_cron journalise chaque exécution dans
-- cron.job_run_details sans jamais purger ; on garde 7 jours d'historique.

-- 1. Extension (procédure Supabase : schéma pg_catalog, tables cron accessibles à postgres)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- 2. Publication des contenus planifiés arrivés à échéance
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
     and scheduled_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 3. Point d'entrée de la tâche « crm-scheduler »
create or replace function crm.run_scheduler()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_error  text;
begin
  begin
    v_result := v_result || jsonb_build_object('contents_published', crm.publish_due_contents());
  exception when others then
    v_error := sqlerrm;
    v_result := v_result || jsonb_build_object('contents_error', v_error);
    -- Une panne persistante ne doit pas écrire 1 440 lignes par jour dans le journal.
    if not exists (
      select 1 from crm.activities
       where entity = 'automations' and entity_id = 'crm-scheduler'
         and summary = 'Planificateur : échec de la publication programmée'
         and at > now() - interval '1 hour'
    ) then
      perform crm.log_system('automations', 'crm-scheduler',
        'Planificateur : échec de la publication programmée',
        jsonb_build_object('error', v_error, 'sqlstate', sqlstate));
    end if;
  end;
  return v_result;
end;
$$;

revoke execute on function crm.publish_due_contents() from public, anon, authenticated;
revoke execute on function crm.run_scheduler() from public, anon, authenticated;

-- 4. Tâches (cron.schedule met à jour une tâche existante du même nom). Heures en UTC.
select cron.schedule('crm-scheduler', '* * * * *', 'select crm.run_scheduler()');
select cron.schedule('crm-cron-purge', '23 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
