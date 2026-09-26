-- Dépôt des fichiers de ressources depuis le CRM (Supabase Storage, bucket « ressources »).
--
-- Le formulaire « Ajouter une ressource » envoie le fichier dans le bucket public
-- « ressources » avec la session de l'utilisateur, puis enregistre son URL publique.
-- Un dépôt n'écrase jamais un fichier (chemin = nom + version + aléa) : l'URL d'une
-- version publiée reste valable.
--   • Types acceptés : PDF, Markdown, texte, ZIP — 20 Mo maximum (mêmes contrôles côté
--     interface : src/features/site/lib/resource.ts, UPLOAD_TYPES / UPLOAD_MAX_BYTES).
--     application/x-zip-compressed : type donné aux ZIP par Windows (dépôt depuis le Dashboard).
--   • Droits : lecture de la liste des fichiers = lecture de la section « ressources » ;
--     dépôt et suppression = écriture sur « ressources » (admin, pédagogie). La
--     suppression sert à retirer un fichier envoyé puis abandonné (formulaire annulé,
--     fichier remplacé avant enregistrement). Le téléchargement reste public (bucket
--     public, URL non devinable) — y compris pour un contenu premium.
--   • Nouveau format de ressource « texte » (.md, .txt) ; la synchro vers le site le
--     publie en format « autre » (crm.push_resource_to_site, inchangée).

-- 1. Bucket (créé s'il manque : environnement neuf)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ressources', 'ressources', true, 20971520,
  array['application/pdf', 'text/markdown', 'text/plain', 'application/zip', 'application/x-zip-compressed']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies storage.objects (bucket « ressources » uniquement)
drop policy if exists crm_ressources_select on storage.objects;
create policy crm_ressources_select on storage.objects for select to authenticated
  using (bucket_id = 'ressources' and (select crm.has_access('ressources', 'read')));

drop policy if exists crm_ressources_insert on storage.objects;
create policy crm_ressources_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ressources' and (select crm.has_access('ressources', 'write')));

drop policy if exists crm_ressources_delete on storage.objects;
create policy crm_ressources_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ressources' and (select crm.has_access('ressources', 'write')));

-- 3. Format « texte »
alter table crm.resources drop constraint if exists resources_format_check;
alter table crm.resources add constraint resources_format_check
  check (format in ('pdf', 'docx', 'xlsx', 'figma', 'notion', 'video', 'lien', 'zip', 'texte'));
