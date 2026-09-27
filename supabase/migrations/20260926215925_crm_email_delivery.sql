-- Envoi réel des emails du back-office.
--
-- Tout email passe par la file crm.email_messages : l'interface (ou le serveur)
-- insère un message « programme » (heure d'envoi = maintenant ou plus tard) ; la
-- base appelle la route /api/emails/dispatch du back-office (pg_net), qui réserve
-- les messages dus (crm.claim_due_emails), les envoie en SMTP et note le résultat
-- (envoye / erreur + raison, 3 tentatives). Déclencheurs :
--   • trigger sur crm.email_messages : envoi immédiat d'un message dû ;
--   • planificateur (crm.run_scheduler, chaque minute) : envois programmés, nouveaux
--     essais, et rattrapage si un appel a échoué.
-- URL et secret de la route : Supabase Vault (`crm_email_dispatch_url`,
-- `crm_email_dispatch_secret`) — absents, rien n'est appelé et les messages attendent.
--
-- Liens publics : documents (facture / devis) par jeton non devinable, et
-- désinscription des emails marketing par contact.
--
-- Modèles de production et séquence Digital Starter Kit : insérés sans écraser un
-- modèle existant (source : src/lib/data/email-templates.ts).

-- 1. File d'envoi
alter table crm.email_messages add column if not exists attempts   integer not null default 0 check (attempts >= 0);
alter table crm.email_messages add column if not exists sending_at timestamptz;   -- réservé par un envoi en cours
alter table crm.email_messages add column if not exists error      text;          -- dernière erreur / raison du non-envoi
alter table crm.email_messages add column if not exists provider_id text;         -- identifiant du message chez le fournisseur
create index if not exists email_messages_due_idx on crm.email_messages (scheduled_at) where status = 'programme';

-- 2. Jetons des liens publics
create or replace function crm.random_token()
returns text
language sql
volatile
set search_path = ''
as $$ select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') $$;

alter table crm.invoices add column if not exists public_token text;
alter table crm.quotes   add column if not exists public_token text;
alter table crm.contacts add column if not exists unsubscribe_token text;
update crm.invoices set public_token = crm.random_token() where public_token is null;
update crm.quotes   set public_token = crm.random_token() where public_token is null;
update crm.contacts set unsubscribe_token = crm.random_token() where unsubscribe_token is null;
alter table crm.invoices alter column public_token set default crm.random_token(), alter column public_token set not null;
alter table crm.quotes   alter column public_token set default crm.random_token(), alter column public_token set not null;
alter table crm.contacts alter column unsubscribe_token set default crm.random_token(), alter column unsubscribe_token set not null;
create unique index if not exists invoices_public_token_key on crm.invoices (public_token);
create unique index if not exists quotes_public_token_key on crm.quotes (public_token);
create unique index if not exists contacts_unsubscribe_token_key on crm.contacts (unsubscribe_token);

-- 3. Réglages
--    site_form_emails : accusés de réception et Digital Starter Kit des formulaires du
--    site envoyés par le CRM. Désactivé tant que les workflows n8n des formulaires
--    envoient encore les leurs (sinon : emails en double).
alter table crm.settings add column if not exists site_form_emails boolean not null default false;
alter table crm.settings add column if not exists satisfaction_form_url text not null default '';
alter table crm.settings alter column email_provider set default 'smtp';
update crm.settings set email_provider = 'smtp' where email_provider = 'resend';

-- 4. Réservation des messages dus (appelée par la route d'envoi, service_role)
create or replace function crm.claim_due_emails(p_limit integer default 10)
returns setof crm.email_messages
language sql
security definer
set search_path = ''
as $$
  update crm.email_messages m
     set sending_at = now(), attempts = m.attempts + 1, updated_at = now()
   where m.id in (
     select e.id
       from crm.email_messages e
      where e.status = 'programme'
        and coalesce(e.scheduled_at, e.created_at) <= now()
        and (e.sending_at is null or e.sending_at < now() - interval '10 minutes')
      order by coalesce(e.scheduled_at, e.created_at)
      limit greatest(1, least(p_limit, 50))
      for update skip locked)
  returning m.*;
$$;

-- 5. Appel de la route d'envoi (asynchrone, pg_net ; URL + secret dans Vault)
create or replace function crm.kick_email_dispatch()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'crm_email_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'crm_email_dispatch_secret';
  if v_url is null or v_secret is null then
    return false;
  end if;
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000);
  return true;
end;
$$;

-- Envoi immédiat : un message dû vient d'être créé ou remis en file.
create or replace function crm.tg_email_messages_kick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from new_rows
              where status = 'programme' and sending_at is null
                and coalesce(scheduled_at, created_at) <= now()) then
    perform crm.kick_email_dispatch();
  end if;
  return null;
end;
$$;

drop trigger if exists email_messages_kick_insert on crm.email_messages;
create trigger email_messages_kick_insert
  after insert on crm.email_messages
  referencing new table as new_rows
  for each statement execute function crm.tg_email_messages_kick();
drop trigger if exists email_messages_kick_update on crm.email_messages;
create trigger email_messages_kick_update
  after update on crm.email_messages
  referencing new table as new_rows
  for each statement execute function crm.tg_email_messages_kick();

-- Planificateur : messages programmés arrivés à échéance, nouveaux essais, rattrapage.
create or replace function crm.kick_due_emails()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from crm.email_messages
              where status = 'programme'
                and coalesce(scheduled_at, created_at) <= now()
                and (sending_at is null or sending_at < now() - interval '10 minutes')) then
    return case when crm.kick_email_dispatch() then 1 else 0 end;
  end if;
  return 0;
end;
$$;

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

  begin
    v_result := v_result || jsonb_build_object('emails_dispatch', crm.kick_due_emails());
  exception when others then
    v_result := v_result || jsonb_build_object('emails_dispatch_error', sqlerrm);
    perform crm.scheduler_failure('envoi des emails', sqlerrm, sqlstate);
  end;

  return v_result;
end;
$$;

revoke execute on function crm.random_token() from public, anon, authenticated;
grant execute on function crm.random_token() to authenticated, service_role;
revoke execute on function crm.claim_due_emails(integer) from public, anon, authenticated;
grant execute on function crm.claim_due_emails(integer) to service_role;
revoke execute on function crm.kick_email_dispatch() from public, anon, authenticated;
revoke execute on function crm.tg_email_messages_kick() from public, anon, authenticated;
revoke execute on function crm.kick_due_emails() from public, anon, authenticated;
revoke execute on function crm.run_scheduler() from public, anon, authenticated;

-- 6. Modèles de production et séquence Digital Starter Kit
insert into crm.email_templates (id, name, category, subject, body, variables, replaces_n8n) values
  ('tpl_ack_candidature', 'Accusé — candidature', 'accuse_reception',
   'Candidature reçue - StartupWeek',
   'Bonjour {{prenom}},

Merci pour votre candidature ! Nous l''avons bien reçue et notre équipe va examiner attentivement votre profil et votre projet.

Session demandée : {{session}}
Dates : {{dates_session}}
Lieu : {{lieu}}

Prochaines étapes :
- Examen de votre dossier (2 à 3 jours ouvrés)
- Entretien de sélection si votre profil correspond : nous vous contactons pour convenir d''un échange
- Réponse définitive par email, avec toutes les informations pratiques

En attendant, découvrez notre programme et les témoignages de nos anciens participants : https://www.startupweek.tech

Une question ? Répondez simplement à cet email.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom', 'session', 'dates_session', 'lieu']::text[], 'Candidature event'),
  ('tpl_ack_contact', 'Accusé — contact', 'accuse_reception',
   'Réponse à votre demande - StartupWeek',
   'Bonjour {{prenom}},

Merci de nous avoir contactés. Nous avons bien reçu votre message et vous répondrons sous 24 à 48 heures (jours ouvrés).

Objet : {{objet}}

En attendant, vous trouverez peut-être la réponse à votre question dans notre FAQ : https://www.startupweek.tech/faq

Besoin d''une réponse plus rapide ? Écrivez-nous à contact@startupweek.tech ou appelez le 07 71 80 02 78.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom', 'objet']::text[], 'Contact'),
  ('tpl_ack_entreprise', 'Accusé — demande entreprise', 'accuse_reception',
   'Demande entreprise reçue - StartupWeek',
   'Bonjour {{prenom}},

Merci pour votre demande concernant notre offre Entreprise : nous sommes ravis de l''intérêt que vous portez à StartupWeek.

Entreprise : {{entreprise}}

Prochaines étapes :
- Analyse de votre demande : notre équipe étudie vos besoins et vos objectifs
- Appel de découverte sous 24 à 48 heures (jours ouvrés)
- Proposition personnalisée : un devis détaillé et sur mesure
- Organisation de votre session, une fois la proposition validée

Nos formules pour les entreprises : https://www.startupweek.tech/offre-entreprise
Besoin de nous joindre rapidement ? entreprise@startupweek.tech ou 07 71 80 02 78.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom', 'entreprise']::text[], 'Entreprise'),
  ('tpl_ack_accompagnement', 'Accusé — accompagnement', 'accuse_reception',
   'Demande d''accompagnement reçue - StartupWeek',
   'Bonjour {{prenom}},

Merci pour votre demande d''accompagnement ! Nous sommes ravis de pouvoir vous aider à faire avancer votre projet.

Offre choisie : {{offre}}

Prochaines étapes :
- Analyse de votre demande et de votre projet
- Prise de contact sous 24 à 48 heures (jours ouvrés) pour un échange personnalisé
- Proposition d''un plan d''accompagnement adapté à vos objectifs

Nos accompagnements : https://www.startupweek.tech/accompagnements
Une question ? accompagnement@startupweek.tech ou 07 71 80 02 78.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom', 'offre']::text[], 'Accompagnements'),
  ('tpl_ack_partenariat', 'Accusé — partenariat', 'accuse_reception',
   'Demande de partenariat reçue - StartupWeek',
   'Bonjour {{prenom}},

Nous avons bien reçu votre demande de partenariat et vous remercions de votre intérêt pour StartupWeek.

Organisation : {{entreprise}}

Prochaines étapes :
- Examen de votre proposition par notre équipe
- Appel sous 24 à 48 heures (jours ouvrés) pour échanger sur les synergies possibles
- Co-construction d''un partenariat sur mesure

En savoir plus : https://www.startupweek.tech/partenaires
Une question ? partenariats@startupweek.tech ou 07 71 80 02 78.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom', 'entreprise']::text[], 'Partenariats'),
  ('tpl_ack_reclamation', 'Accusé — réclamation (formulaire)', 'accuse_reception',
   'Réclamation reçue - StartupWeek',
   'Bonjour {{prenom}},

Nous avons bien reçu votre réclamation, enregistrée sous la référence {{numero_reclamation}}. Elle est transmise à notre responsable qualité, qui l''analysera et vous répondra sous 48 heures ouvrées.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom', 'numero_reclamation']::text[], 'Reclamation'),
  ('tpl_dsk', 'Digital Starter Kit — envoi', 'accuse_reception',
   '🎁 Ton Digital Starter Kit StartupWeek est prêt',
   'Bonjour {{prenom}},

Merci pour ta demande ! Voici ton Digital Starter Kit : une acculturation gratuite pour poser les bases du digital, de l''IA et du MVP avant d''intégrer un programme StartupWeek.

Accéder au kit : https://www.startupweek.tech/digital-starter-kit

Ce que tu vas y trouver :
- Comprendre ce qu''est un MVP et comment le cadrer
- Les bases du produit digital (site, app, SaaS, no-code, IA)
- Le vocabulaire essentiel : front, back, API, authentification, hébergement
- Comment prioriser un périmètre de MVP réaliste
- Les erreurs fréquentes des porteurs de projet non-tech

Prochaine étape : quand tu te sens prêt(e), découvre nos programmes ou candidate directement sur https://www.startupweek.tech/candidature

À très vite,
L''équipe StartupWeek',
   array['prenom']::text[], 'Digital Starter Kit'),
  ('tpl_dsk_j3', 'Digital Starter Kit — suite (J+3)', 'nurturing',
   'Ton Digital Starter Kit : et maintenant ?',
   'Bonjour {{prenom}},

Il y a quelques jours, tu as reçu ton Digital Starter Kit. Tu as pu y jeter un œil ?

Pour passer de l''idée au MVP, deux options :
- Découvrir les prochaines sessions StartupWeek : https://www.startupweek.tech/events
- Faire le point sur ton projet avec notre équipe : réponds simplement à cet email

Et si tu n''as pas encore ouvert le kit, il t''attend ici : https://www.startupweek.tech/digital-starter-kit

À très vite,
L''équipe StartupWeek',
   array['prenom']::text[], null),
  ('tpl_entretien', 'Invitation à l''entretien', 'candidature',
   'Votre entretien StartupWeek — {{date_entretien}}',
   'Bonjour {{prenom}},

Merci pour votre candidature à la session {{session}} ({{code_session}}). Nous vous proposons un entretien de sélection d''environ 30 minutes le {{date_entretien}}.

L''échange se fait en visio ; le lien vous sera communiqué avant le rendez-vous. Si ce créneau ne vous convient pas, répondez simplement à cet email pour en convenir d''un autre.

À très bientôt,
L''équipe StartupWeek',
   array['date_entretien', 'prenom', 'session', 'code_session']::text[], null),
  ('tpl_accept_presentiel', 'Acceptation — présentiel', 'candidature',
   '🎉 Votre candidature est acceptée — {{session}}',
   'Bonjour {{prenom}},

Excellente nouvelle : votre candidature pour la session {{session}} ({{code_session}}) est acceptée. Félicitations !

Dates : du {{date_debut}} au {{date_fin}}
Lieu : {{lieu}}

Pour confirmer votre place, merci de régler l''acompte de {{montant_acompte}} : {{lien_paiement}}

Le solde sera à régler avant le début de la session, conformément à nos conditions générales de vente. Les informations pratiques (adresse exacte, horaires, matériel) vous seront envoyées avec votre convocation.

Bienvenue dans l''aventure,
L''équipe StartupWeek',
   array['session', 'prenom', 'code_session', 'date_debut', 'date_fin', 'lieu', 'montant_acompte', 'lien_paiement']::text[], null),
  ('tpl_accept_distanciel', 'Acceptation — distanciel', 'candidature',
   '🎉 Votre candidature est acceptée — {{session}} (en ligne)',
   'Bonjour {{prenom}},

Excellente nouvelle : votre candidature pour la session en ligne {{session}} ({{code_session}}) est acceptée. Félicitations !

Dates : du {{date_debut}} au {{date_fin}}
Format : en ligne (distanciel)

Pour confirmer votre place, merci de régler l''acompte de {{montant_acompte}} : {{lien_paiement}}

Le solde sera à régler avant le début de la session, conformément à nos conditions générales de vente. Toutes les informations pour préparer votre session vous seront envoyées avec votre convocation.

Bienvenue dans l''aventure,
L''équipe StartupWeek',
   array['session', 'prenom', 'code_session', 'date_debut', 'date_fin', 'montant_acompte', 'lien_paiement']::text[], null),
  ('tpl_refus', 'Refus de candidature', 'candidature',
   'Votre candidature StartupWeek',
   'Bonjour {{prenom}},

Merci pour votre candidature et pour le temps que vous nous avez consacré. Après une étude attentive, nous ne sommes pas en mesure de la retenir pour la session {{session}}.

Ce n''est pas un jugement sur votre projet : nous pensons qu''il gagnera à mûrir avant une StartupWeek. Notre Digital Starter Kit, gratuit, est un bon point de départ : https://www.startupweek.tech/digital-starter-kit

Nous serons heureux d''étudier une nouvelle candidature de votre part pour une prochaine session.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom', 'session']::text[], null),
  ('tpl_convocation', 'Convocation', 'qualiopi',
   'Convocation — {{session}} ({{date_debut}})',
   'Bonjour {{prenom}},

Nous avons le plaisir de vous convoquer à la formation {{session}} ({{code_session}}).

Dates : du {{date_debut}} au {{date_fin}}
Durée : {{duree}}
Lieu : {{lieu}}

Le programme détaillé, le livret d''accueil et le règlement intérieur vous sont transmis sur simple demande en réponse à cet email.

Besoin d''un aménagement (situation de handicap, contrainte particulière) ? Répondez à cet email : notre référent handicap vous recontactera.

À très bientôt,
L''équipe StartupWeek',
   array['session', 'date_debut', 'prenom', 'code_session', 'date_fin', 'duree', 'lieu']::text[], null),
  ('tpl_reclamation_accuse', 'Accusé de réception — réclamation', 'qualiopi',
   'Votre réclamation {{numero_reclamation}} : accusé de réception',
   'Bonjour {{prenom}},

Nous accusons réception de votre réclamation {{numero_reclamation}} du {{date_reception}}. Elle a été transmise à notre responsable qualité, qui l''analyse et vous apportera une réponse détaillée dans les meilleurs délais.

Bien cordialement,
L''équipe StartupWeek',
   array['numero_reclamation', 'prenom', 'date_reception']::text[], null),
  ('tpl_eval_chaud', 'Questionnaire à chaud', 'qualiopi',
   'Votre avis sur la session {{session}} (2 minutes)',
   'Bonjour {{prenom}},

Merci d''avoir participé à la session {{session}} ({{code_session}}) ! Votre avis nous aide à améliorer chaque édition : pouvez-vous répondre à notre questionnaire de satisfaction (2 minutes) ?

{{lien_questionnaire}}

Merci d''avance,
L''équipe StartupWeek',
   array['session', 'prenom', 'code_session', 'lien_questionnaire']::text[], null),
  ('tpl_facture_envoi', 'Envoi de facture', 'facturation',
   'Facture {{numero}} — StartupWeek',
   'Bonjour {{prenom}},

Veuillez trouver votre facture {{numero}} d''un montant de {{montant}}, à régler avant le {{echeance}} : {{lien_document}}

Règlement : {{lien_paiement}}

Merci pour votre confiance,
L''équipe StartupWeek',
   array['numero', 'prenom', 'montant', 'echeance', 'lien_document', 'lien_paiement']::text[], null),
  ('tpl_facture_acompte', 'Facture d''acompte', 'facturation',
   'Votre acompte pour {{session}} — facture {{numero}}',
   'Bonjour {{prenom}},

Voici la facture d''acompte {{numero}} ({{montant}}) pour la session {{session}} : {{lien_document}}

Règlement : {{lien_paiement}}

Le règlement de l''acompte confirme votre inscription.

Merci pour votre confiance,
L''équipe StartupWeek',
   array['session', 'numero', 'prenom', 'montant', 'lien_document', 'lien_paiement']::text[], null),
  ('tpl_avoir_envoi', 'Envoi d''avoir', 'facturation',
   'Avoir {{numero}} — StartupWeek',
   'Bonjour {{prenom}},

Veuillez trouver l''avoir {{numero}} d''un montant de {{montant}} : {{lien_document}}

Bien cordialement,
L''équipe StartupWeek',
   array['numero', 'prenom', 'montant', 'lien_document']::text[], null),
  ('tpl_facture_rappel', 'Rappel avant échéance', 'facturation',
   'Rappel : facture {{numero}} à régler avant le {{echeance}}',
   'Bonjour {{prenom}},

Petit rappel : la facture {{numero}} ({{montant}}) arrive à échéance le {{echeance}}.

Facture : {{lien_document}}
Règlement : {{lien_paiement}}

Si vous avez déjà effectué le règlement, merci de ne pas tenir compte de ce message.

Bien cordialement,
L''équipe StartupWeek',
   array['numero', 'echeance', 'prenom', 'montant', 'lien_document', 'lien_paiement']::text[], null),
  ('tpl_relance_facture_j3', 'Relance facture J+3', 'facturation',
   'Rappel : facture {{numero}} en attente de règlement',
   'Bonjour {{prenom}},

Sauf erreur de notre part, la facture {{numero}} d''un montant de {{montant}}, arrivée à échéance le {{echeance}}, reste à régler.

Facture : {{lien_document}}
Règlement : {{lien_paiement}}

Si vous avez déjà effectué le règlement, merci de ne pas tenir compte de ce message.

Bien cordialement,
L''équipe StartupWeek',
   array['numero', 'prenom', 'montant', 'echeance', 'lien_document', 'lien_paiement']::text[], null),
  ('tpl_relance_facture_j10', 'Relance facture J+10', 'facturation',
   'Relance : facture {{numero}} impayée',
   'Bonjour {{prenom}},

Malgré notre précédent rappel, la facture {{numero}} d''un montant de {{montant}}, échue le {{echeance}}, reste impayée.

Facture : {{lien_document}}
Règlement : {{lien_paiement}}

Merci de procéder au règlement dans les meilleurs délais. Conformément à nos conditions générales de vente, une place en session peut être libérée si le solde n''est pas réglé à temps. En cas de difficulté, répondez à cet email : nous trouverons une solution ensemble.

Bien cordialement,
L''équipe StartupWeek',
   array['numero', 'prenom', 'montant', 'echeance', 'lien_document', 'lien_paiement']::text[], null),
  ('tpl_mise_en_demeure', 'Mise en demeure', 'facturation',
   'Mise en demeure — facture {{numero}} impayée',
   'Bonjour,

Malgré nos relances, la facture {{numero}} d''un montant de {{montant}}, échue le {{echeance}}, reste impayée.

Nous vous mettons en demeure de la régler sous 8 jours : {{lien_paiement}}
Facture : {{lien_document}}

À défaut, des pénalités de retard seront appliquées conformément à nos conditions générales de vente et à l''article L441-10 du Code de commerce.

Bien cordialement,
L''équipe StartupWeek',
   array['numero', 'montant', 'echeance', 'lien_paiement', 'lien_document']::text[], null),
  ('tpl_devis_envoi', 'Envoi de devis', 'facturation',
   'Votre devis StartupWeek {{numero}}',
   'Bonjour {{prenom}},

Comme convenu, voici notre proposition {{numero}} d''un montant de {{montant}} HT, valable jusqu''au {{validite}} : {{lien_document}}

Un simple « bon pour accord » en réponse à cet email suffit pour lancer l''organisation. Nous restons à votre disposition pour l''ajuster à vos contraintes.

Bien cordialement,
L''équipe StartupWeek',
   array['numero', 'prenom', 'montant', 'validite', 'lien_document']::text[], null),
  ('tpl_relance_devis', 'Relance devis', 'relance',
   'Votre proposition StartupWeek',
   'Bonjour {{prenom}},

Avez-vous pu prendre connaissance de notre proposition ? Nous restons disponibles pour en discuter et l''ajuster à vos contraintes (dates, format, nombre de participants).

Il suffit de répondre à cet email.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom']::text[], null),
  ('tpl_relance_contact', 'Relance après échange', 'relance',
   'Suite à notre échange — StartupWeek',
   'Bonjour {{prenom}},

Je reviens vers vous suite à notre échange. Avez-vous pu avancer dans votre réflexion ? Nous restons à votre disposition pour répondre à vos questions.

Il suffit de répondre à cet email.

Bien cordialement,
L''équipe StartupWeek',
   array['prenom']::text[], null)
on conflict (id) do nothing;

insert into crm.sequences (id, name, description, trigger, active, steps) values
  ('seq_dsk', 'Digital Starter Kit', 'Envoi du kit à la demande, puis email de suite à J+3 (contacts ayant accepté les communications).', 'digital_starter_kit', true,
   '[{"id":"seq_dsk_s1","delayDays":0,"channel":"email","label":"Envoi du kit","templateId":"tpl_dsk"},{"id":"seq_dsk_s2","delayDays":3,"channel":"email","label":"Suite à J+3","templateId":"tpl_dsk_j3"}]'::jsonb)
on conflict (id) do nothing;
