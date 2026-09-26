-- Numéro des candidatures (colonne identity `number`) : réaligne la séquence quand un
-- numéro est fourni explicitement (import, saisie depuis l'interface) ; sinon l'insertion
-- suivante qui s'appuie sur la valeur par défaut (formulaires du site) tombait sur un
-- numéro déjà pris (applications_number_key). Constaté le 26/09/2026.

create or replace function crm.tg_applications_number_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seq  text := pg_get_serial_sequence('crm.applications', 'number');
  v_last bigint;
  v_called boolean;
begin
  if v_seq is null or new.number is null then
    return new;
  end if;
  execute format('select last_value, is_called from %s', v_seq) into v_last, v_called;
  if new.number > v_last or (new.number = v_last and not v_called) then
    perform setval(v_seq, new.number, true);
  end if;
  return new;
end;
$$;

revoke execute on function crm.tg_applications_number_sync() from public, anon, authenticated;

drop trigger if exists applications_number_sync on crm.applications;
create trigger applications_number_sync
  before insert or update of number on crm.applications
  for each row execute function crm.tg_applications_number_sync();

-- Réalignement immédiat sur les numéros déjà en base.
select setval(pg_get_serial_sequence('crm.applications', 'number'), greatest(coalesce(max(number), 0), 1), coalesce(max(number), 0) > 0)
from crm.applications;
