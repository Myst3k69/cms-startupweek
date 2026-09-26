-- ════════════════════════════════════════════════════════════════════════════
-- StartupWeek OS — 5 : connexion de l'équipe (lien magique)
--
-- A. crm.claim_team_membership() : appelée juste après la connexion. Renvoie l'id du
--    membre actif rattaché au compte Supabase Auth ; à la première connexion, rattache
--    le compte au membre créé dans Paramètres → Équipe avec la MÊME adresse email, à
--    condition que cet email soit vérifié (le lien magique le prouve). Un compte déjà
--    rattaché à un membre désactivé n'obtient rien.
-- B. Journal d'activité sans doublon : l'interface journalise elle-même ses actions
--    (libellés précis : « Candidature acceptée — acompte émis »…). Le trigger d'audit
--    ne journalise donc plus que les écritures faites hors session d'un membre
--    (routes API /api/* en service_role, SQL, synchronisations).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── A. Rattachement compte Auth → membre de l'équipe ───

create or replace function crm.claim_team_membership()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_id     text;
  v_active boolean;
  v_email  text;
begin
  if v_uid is null then
    return null;
  end if;

  select m.id, m.active into v_id, v_active
  from crm.team_members m
  where m.auth_user_id = v_uid;
  if found then
    return case when v_active then v_id end;
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    return null;
  end if;

  update crm.team_members m
  set auth_user_id = v_uid
  where m.id = (
    select m2.id
    from crm.team_members m2
    where lower(m2.email) = v_email and m2.auth_user_id is null and m2.active
    order by m2.created_at
    limit 1
  )
  returning m.id into v_id;
  return v_id;
end;
$$;

comment on function crm.claim_team_membership() is
  'Id du membre actif lié au compte connecté ; rattache à la première connexion le membre de même email (email vérifié).';

revoke execute on function crm.claim_team_membership() from public, anon;
grant execute on function crm.claim_team_membership() to authenticated, service_role;

-- ─── B. Audit : uniquement hors session d'un membre de l'équipe ───

create or replace function crm.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := tg_argv[0];
  v_col    text := coalesce(tg_argv[1], 'status');
  v_create text := coalesce(tg_argv[2], 'Élément créé');
  v_label  text := coalesce(tg_argv[3], 'Statut');
  v_new    jsonb := to_jsonb(new);
  v_from   text;
  v_to     text := v_new ->> v_col;
begin
  -- Action d'un membre connecté : déjà journalisée par l'interface.
  if crm.current_member_id() is not null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into crm.activities (actor_id, kind, entity, entity_id, summary, meta)
    values (null, 'creation', v_entity, v_new ->> 'id', v_create,
            jsonb_build_object(v_col, coalesce(v_to, '')));
  elsif tg_op = 'UPDATE' then
    v_from := to_jsonb(old) ->> v_col;
    if v_from is distinct from v_to then
      insert into crm.activities (actor_id, kind, entity, entity_id, summary, meta)
      values (null, 'statut', v_entity, v_new ->> 'id',
              format('%s : %s → %s', v_label, coalesce(v_from, '—'), coalesce(v_to, '—')),
              jsonb_build_object('field', v_col, 'from', coalesce(v_from, ''), 'to', coalesce(v_to, '')));
    end if;
  end if;
  return null;
end;
$$;

revoke execute on function crm.tg_audit() from public, anon, authenticated;
grant execute on function crm.tg_audit() to service_role;
