-- Facturation : la banque et la comptabilité sont tenues dans Indy (compte pro, synchronisation
-- bancaire, rapprochement). Le CRM ne relève plus de compte bancaire : la synchro Qonto
-- (/api/qonto/sync) et l'onglet « Rapprochement » sont retirés du code ; cette migration supprime
-- la table des transactions, le lien paiement → transaction et l'indicateur « Qonto connecté ».
--
-- Vérifié le 28/09/2026 en production : crm.bank_transactions est vide (0 ligne) et aucune fonction
-- ni vue ne la lit ; seule dépendance : la clé étrangère crm.payments.bank_transaction_id.
-- Garde-fou : si des lignes sont apparues entre-temps, la migration s'arrête sans rien modifier.
--
-- Ordre de déploiement : le code d'abord (il ne lit plus ces objets), puis cette migration.
-- Conservé volontairement : la valeur 'bankTransactions' reste admise par activities_entity_check
-- (sans effet ; la contrainte est redéfinie par d'autres migrations en cours de relecture).

do $$
declare
  n bigint;
begin
  -- Requête dynamique : la migration reste rejouable une fois la table supprimée.
  if to_regclass('crm.bank_transactions') is not null then
    execute 'select count(*) from crm.bank_transactions' into n;
    if n > 0 then
      raise exception 'crm.bank_transactions contient % ligne(s) : les exporter avant de supprimer la table (migration interrompue, rien n''est modifié)', n;
    end if;
  end if;
end
$$;

alter table crm.payments drop column if exists bank_transaction_id;

-- Supprime aussi ses index, sa politique RLS, son trigger d'audit et sa clé vers crm.invoices.
drop table if exists crm.bank_transactions;

alter table crm.settings drop column if exists qonto_connected;
