-- Blog et FAQ du site pilotés par le back-office.
--
-- crm.contents (brouillons, relecture, planning) reste privé. Les contenus au statut
-- « publie » sont recopiés par trigger dans deux tables publiques lues par le site
-- (côté serveur, clé secrète, revalidation 60 s) :
--   • type 'article' + canal 'blog' + slug renseigné → public.blog_post
--   • type 'faq' (question = titre, réponse = corps)  → public.faq_item
-- Tout autre statut (ou type / canal) retire la ligne publique. Même principe que
-- crm.sessions → public.event.

-- 1. Champs de publication
alter table crm.contents add column if not exists category   text    not null default '';
alter table crm.contents add column if not exists sort_order integer not null default 0;
-- Champs propres au blog : readTime, author {name, role, image, bio}, keyPoints[],
-- faq[{question, answer}], cta{title, description, primaryLabel, primaryHref,
-- secondaryLabel?, secondaryHref?}, relatedPosts[], toc[{id, title, level}], mobileImage.
alter table crm.contents add column if not exists meta       jsonb   not null default '{}'::jsonb;

-- 2. Tables lues par le site
create table if not exists public.blog_post (
  slug            text primary key,
  crm_id          text not null unique,
  title           text not null,
  excerpt         text not null default '',
  category        text not null default '',
  cover_url       text,
  published_at    date,
  sort_order      integer not null default 0,
  body_md         text not null default '',
  meta            jsonb not null default '{}'::jsonb,
  seo_title       text,
  seo_description text,
  updated_at      timestamptz not null default now()
);
create index if not exists blog_post_published_idx on public.blog_post (published_at desc, sort_order);

create table if not exists public.faq_item (
  id         text primary key,          -- identifiant du contenu CRM
  question   text not null,
  answer     text not null default '',
  category   text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists faq_item_category_idx on public.faq_item (category, sort_order);

-- Lecture réservée au serveur du site (clé secrète) : RLS active, aucune policy.
alter table public.blog_post enable row level security;
alter table public.faq_item  enable row level security;
revoke all on public.blog_post, public.faq_item from anon, authenticated;
grant select, insert, update, delete on public.blog_post, public.faq_item to service_role;

-- 3. Recopie
create or replace function crm.push_content_to_site(p_content_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c        crm.contents;
  v_rows   integer;
  v_freed  text;
begin
  select * into c from crm.contents where id = p_content_id;
  if not found then
    delete from public.blog_post where crm_id = p_content_id;
    delete from public.faq_item where id = p_content_id;
    return;
  end if;

  -- Blog
  if c.type = 'article' and c.channel = 'blog' and c.status = 'publie' and btrim(c.slug) <> '' then
    delete from public.blog_post where crm_id = c.id and slug <> c.slug returning slug into v_freed;   -- slug modifié
    insert into public.blog_post as b (
      slug, crm_id, title, excerpt, category, cover_url, published_at, sort_order,
      body_md, meta, seo_title, seo_description, updated_at
    )
    values (
      c.slug, c.id, c.title, c.excerpt, c.category, nullif(btrim(coalesce(c.cover_url, '')), ''),
      (coalesce(c.published_at, c.updated_at) at time zone 'Europe/Paris')::date, c.sort_order,
      c.body, c.meta, c.seo_title, c.seo_description, now()
    )
    on conflict (slug) do update set
      title = excluded.title, excerpt = excluded.excerpt, category = excluded.category,
      cover_url = excluded.cover_url, published_at = excluded.published_at, sort_order = excluded.sort_order,
      body_md = excluded.body_md, meta = excluded.meta, seo_title = excluded.seo_title,
      seo_description = excluded.seo_description, updated_at = now()
    where b.crm_id = excluded.crm_id;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      perform crm.log_system('contents', c.id,
        format('Article non publié sur le site : le slug « %s » est déjà utilisé par un autre article', c.slug));
    end if;
  else
    delete from public.blog_post where crm_id = c.id returning slug into v_freed;
  end if;
  -- Un slug libéré peut débloquer un autre article publié qui l'attendait (conflit antérieur).
  if v_freed is not null then
    perform crm.push_content_to_site(o.id)
    from crm.contents o
    where o.id <> c.id and o.slug = v_freed and o.type = 'article' and o.channel = 'blog' and o.status = 'publie'
      and not exists (select 1 from public.blog_post b where b.slug = v_freed);
  end if;

  -- FAQ
  if c.type = 'faq' and c.status = 'publie' and btrim(c.title) <> '' then
    insert into public.faq_item as f (id, question, answer, category, sort_order, updated_at)
    values (c.id, c.title, c.body, c.category, c.sort_order, now())
    on conflict (id) do update set
      question = excluded.question, answer = excluded.answer, category = excluded.category,
      sort_order = excluded.sort_order, updated_at = now();
  else
    delete from public.faq_item where id = c.id;
  end if;
exception when others then
  perform crm.log_system('contents', p_content_id, 'Échec de la synchro du contenu vers le site',
    jsonb_build_object('error', sqlerrm, 'sqlstate', sqlstate));
end;
$$;

create or replace function crm.tg_contents_site_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.blog_post where crm_id = old.id;
    delete from public.faq_item where id = old.id;
    return old;
  end if;
  perform crm.push_content_to_site(new.id);
  return new;
end;
$$;

revoke execute on function crm.push_content_to_site(text) from public, anon, authenticated;
revoke execute on function crm.tg_contents_site_sync() from public, anon, authenticated;

drop trigger if exists contents_site_sync on crm.contents;
create trigger contents_site_sync
  after insert or update or delete on crm.contents
  for each row execute function crm.tg_contents_site_sync();

-- 4. Rattrapage des contenus déjà publiés
select crm.push_content_to_site(id) from crm.contents;
