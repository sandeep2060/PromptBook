-- PromptBook database bootstrap
-- Paste this entire file into Supabase SQL Editor and run it once.
-- Safe to re-run for policies/functions, but table creation assumes a fresh PromptBook schema.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'PromptBook Creator',
  avatar_url text,
  bio text default '',
  website_url text,
  followers_count bigint not null default 0,
  following_count bigint not null default 0,
  posts_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (username is null or char_length(username) between 3 and 30),
  constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]+$')
);

create table if not exists public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  prompt text not null,
  negative_prompt text default '',
  ai_tool_id uuid references public.ai_tools(id) on delete set null,
  ai_model text default '',
  category_id uuid references public.categories(id) on delete set null,
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  post_type text not null default 'ai_edit' check (post_type in ('ai_edit','ai_generation','prompt_only','video_prompt')),
  status text not null default 'published' check (status in ('draft','published','hidden','deleted')),
  views_count bigint not null default 0,
  likes_count bigint not null default 0,
  saves_count bigint not null default 0,
  copies_count bigint not null default 0,
  remixes_count bigint not null default 0,
  comments_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_title_length check (char_length(title) between 2 and 120),
  constraint posts_prompt_length check (char_length(prompt) between 2 and 30000)
);

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  image_type text not null check (image_type in ('before','after','thumbnail')),
  storage_path text not null,
  width integer,
  height integer,
  file_size bigint,
  created_at timestamptz not null default now(),
  unique(post_id, image_type)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null
);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key(post_id, tag_id)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  cover_image text,
  visibility text not null default 'private' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_length check (char_length(content) between 1 and 2000)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('like','save','follow','remix','comment','milestone')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.remixes (
  id uuid primary key default gen_random_uuid(),
  original_post_id uuid not null references public.posts(id) on delete cascade,
  remix_post_id uuid not null unique references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint remixes_not_self check (original_post_id <> remix_post_id)
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  version_number integer not null,
  prompt text not null,
  negative_prompt text default '',
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(post_id, version_number)
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(collection_id, post_id)
);

create table if not exists public.prompt_copies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  session_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','user')),
  target_id uuid not null,
  reason text not null,
  description text default '',
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now(),
  unique(reporter_id, target_type, target_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_category_id_idx on public.posts(category_id);
create index if not exists posts_ai_tool_id_idx on public.posts(ai_tool_id);
create index if not exists posts_visibility_idx on public.posts(visibility);
create index if not exists posts_copies_idx on public.posts(copies_count desc);
create index if not exists posts_likes_idx on public.posts(likes_count desc);
create index if not exists posts_views_idx on public.posts(views_count desc);
create index if not exists likes_post_idx on public.likes(post_id);
create index if not exists likes_user_idx on public.likes(user_id);
create index if not exists saves_post_idx on public.saves(post_id);
create index if not exists saves_user_idx on public.saves(user_id);
create index if not exists comments_post_idx on public.comments(post_id, created_at desc);
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists prompt_copies_post_idx on public.prompt_copies(post_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists collections_updated_at on public.collections;
create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base_username text; candidate text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'name','creator'), '[^a-zA-Z0-9_]+', '', 'g'));
  if char_length(base_username) < 3 then base_username := 'creator'; end if;
  candidate := left(base_username, 24);
  if exists(select 1 from public.profiles where username = candidate) then candidate := left(candidate, 18) || '_' || substr(replace(new.id::text,'-',''),1,6); end if;
  insert into public.profiles(id, username, display_name) values(new.id, candidate, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', 'PromptBook Creator'));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.increment_post_metric(p_post_id uuid, p_metric text) returns bigint language plpgsql security definer set search_path = public as $$
declare result bigint;
begin
  if p_metric not in ('views_count','copies_count','remixes_count') then raise exception 'Invalid metric'; end if;
  execute format('update public.posts set %I = %I + 1 where id = $1 returning %I', p_metric, p_metric, p_metric) into result using p_post_id;
  return coalesce(result,0);
end; $$;

grant execute on function public.increment_post_metric(uuid,text) to anon, authenticated;

create or replace function public.handle_like_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.posts set likes_count = likes_count + 1 where id = new.post_id; return new; end; $$;
create or replace function public.handle_like_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.posts set likes_count = greatest(likes_count - 1,0) where id = old.post_id; return old; end; $$;
drop trigger if exists likes_counter_insert on public.likes;
create trigger likes_counter_insert after insert on public.likes for each row execute function public.handle_like_insert();
drop trigger if exists likes_counter_delete on public.likes;
create trigger likes_counter_delete after delete on public.likes for each row execute function public.handle_like_delete();

create or replace function public.handle_save_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.posts set saves_count = saves_count + 1 where id = new.post_id; return new; end; $$;
create or replace function public.handle_save_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.posts set saves_count = greatest(saves_count - 1,0) where id = old.post_id; return old; end; $$;
drop trigger if exists saves_counter_insert on public.saves;
create trigger saves_counter_insert after insert on public.saves for each row execute function public.handle_save_insert();
drop trigger if exists saves_counter_delete on public.saves;
create trigger saves_counter_delete after delete on public.saves for each row execute function public.handle_save_delete();

create or replace function public.handle_follow_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.profiles set following_count=following_count+1 where id=new.follower_id; update public.profiles set followers_count=followers_count+1 where id=new.following_id; return new; end; $$;
create or replace function public.handle_follow_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.profiles set following_count=greatest(following_count-1,0) where id=old.follower_id; update public.profiles set followers_count=greatest(followers_count-1,0) where id=old.following_id; return old; end; $$;
drop trigger if exists follows_counter_insert on public.follows;
create trigger follows_counter_insert after insert on public.follows for each row execute function public.handle_follow_insert();
drop trigger if exists follows_counter_delete on public.follows;
create trigger follows_counter_delete after delete on public.follows for each row execute function public.handle_follow_delete();

create or replace function public.handle_post_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.profiles set posts_count=posts_count+1 where id=new.user_id; return new; end; $$;
create or replace function public.handle_post_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.profiles set posts_count=greatest(posts_count-1,0) where id=old.user_id; return old; end; $$;
drop trigger if exists posts_counter_insert on public.posts;
create trigger posts_counter_insert after insert on public.posts for each row execute function public.handle_post_insert();
drop trigger if exists posts_counter_delete on public.posts;
create trigger posts_counter_delete after delete on public.posts for each row execute function public.handle_post_delete();

-- Seed catalogs.
insert into public.ai_tools(name,slug) values
('ChatGPT','chatgpt'),('Gemini','gemini'),('Midjourney','midjourney'),('Adobe Firefly','adobe-firefly'),('Leonardo AI','leonardo-ai'),('Flux','flux'),('Stable Diffusion','stable-diffusion'),('Ideogram','ideogram'),('Grok','grok'),('Other','other')
on conflict(slug) do nothing;

insert into public.categories(name,slug,description) values
('Photography','photography','Camera, editing and realistic visual prompts.'),
('Portrait','portrait','People, faces and character portrait prompts.'),
('Landscape','landscape','Nature, travel and environmental scenes.'),
('Product','product','Commercial product and brand imagery.'),
('Fashion','fashion','Editorial, outfits and fashion concepts.'),
('Art','art','Illustration, concept art and creative styles.'),
('Architecture','architecture','Buildings, interiors and architectural studies.'),
('Automotive','automotive','Cars, motorcycles and mobility visuals.'),
('Writing','writing','Useful text and writing prompt workflows.')
on conflict(slug) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.ai_tools enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.collections enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.remixes enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.collection_items enable row level security;
alter table public.prompt_copies enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

-- Drop app policies so the script can be safely re-run.
do $$ declare r record; begin for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop; end $$;

create policy profiles_select_public on public.profiles for select using (true);
create policy profiles_insert_self on public.profiles for insert with check (auth.uid()=id);
create policy profiles_update_self on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);

create policy catalogs_select_public on public.ai_tools for select using (true);
create policy categories_select_public on public.categories for select using (true);

create policy posts_select_public on public.posts for select using (visibility in ('public','unlisted') and status='published' or auth.uid()=user_id);
create policy posts_insert_self on public.posts for insert with check (auth.uid()=user_id);
create policy posts_update_self on public.posts for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy posts_delete_self on public.posts for delete using (auth.uid()=user_id);

create policy post_images_select_public on public.post_images for select using (exists(select 1 from public.posts p where p.id=post_id and (p.visibility in ('public','unlisted') or p.user_id=auth.uid())));
create policy post_images_insert_owner on public.post_images for insert with check (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy post_images_update_owner on public.post_images for update using (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy post_images_delete_owner on public.post_images for delete using (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));

create policy tags_select_public on public.tags for select using (true);
create policy tags_insert_auth on public.tags for insert with check (auth.uid() is not null);
create policy post_tags_select_public on public.post_tags for select using (exists(select 1 from public.posts p where p.id=post_id and (p.visibility in ('public','unlisted') or p.user_id=auth.uid())));
create policy post_tags_insert_owner on public.post_tags for insert with check (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy post_tags_delete_owner on public.post_tags for delete using (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));

create policy likes_select_public on public.likes for select using (true);
create policy likes_insert_self on public.likes for insert with check (auth.uid()=user_id);
create policy likes_delete_self on public.likes for delete using (auth.uid()=user_id);

create policy saves_select_self on public.saves for select using (auth.uid()=user_id);
create policy saves_insert_self on public.saves for insert with check (auth.uid()=user_id);
create policy saves_delete_self on public.saves for delete using (auth.uid()=user_id);

create policy collections_select on public.collections for select using (visibility='public' or auth.uid()=user_id);
create policy collections_insert_self on public.collections for insert with check (auth.uid()=user_id);
create policy collections_update_self on public.collections for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy collections_delete_self on public.collections for delete using (auth.uid()=user_id);
create policy collection_items_select on public.collection_items for select using (exists(select 1 from public.collections c where c.id=collection_id and (c.visibility='public' or c.user_id=auth.uid())));
create policy collection_items_insert_owner on public.collection_items for insert with check (exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid()));
create policy collection_items_delete_owner on public.collection_items for delete using (exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid()));

create policy follows_select_public on public.follows for select using (true);
create policy follows_insert_self on public.follows for insert with check (auth.uid()=follower_id and follower_id<>following_id);
create policy follows_delete_self on public.follows for delete using (auth.uid()=follower_id);

create policy comments_select_public on public.comments for select using (exists(select 1 from public.posts p where p.id=post_id and p.visibility in ('public','unlisted') and p.status='published'));
create policy comments_insert_self on public.comments for insert with check (auth.uid()=user_id and exists(select 1 from public.posts p where p.id=post_id and p.visibility in ('public','unlisted') and p.status='published'));
create policy comments_update_self on public.comments for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy comments_delete_self on public.comments for delete using (auth.uid()=user_id);

create policy notifications_select_self on public.notifications for select using (auth.uid()=user_id);
create policy notifications_update_self on public.notifications for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy remixes_select_public on public.remixes for select using (true);
create policy remixes_insert_owner on public.remixes for insert with check (exists(select 1 from public.posts p where p.id=remix_post_id and p.user_id=auth.uid()));
create policy remixes_delete_owner on public.remixes for delete using (exists(select 1 from public.posts p where p.id=remix_post_id and p.user_id=auth.uid()));

create policy prompt_versions_select on public.prompt_versions for select using (exists(select 1 from public.posts p where p.id=post_id and (p.visibility in ('public','unlisted') or p.user_id=auth.uid())));
create policy prompt_versions_insert_owner on public.prompt_versions for insert with check (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy prompt_versions_update_owner on public.prompt_versions for update using (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy prompt_versions_delete_owner on public.prompt_versions for delete using (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));

create policy prompt_copies_insert_any on public.prompt_copies for insert with check (auth.uid() is null or auth.uid()=user_id);
create policy prompt_copies_select_owner on public.prompt_copies for select using (exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));

create policy reports_insert_self on public.reports for insert with check (auth.uid()=reporter_id);
create policy reports_select_self on public.reports for select using (auth.uid()=reporter_id);

create policy blocks_select_self on public.blocks for select using (auth.uid()=blocker_id);
create policy blocks_insert_self on public.blocks for insert with check (auth.uid()=blocker_id and blocker_id<>blocked_id);
create policy blocks_delete_self on public.blocks for delete using (auth.uid()=blocker_id);

-- Storage buckets. Public read is appropriate for public PromptBook images; RLS still controls uploads/changes.
insert into storage.buckets(id,name,public,file_size_limit,mime_types)
values ('avatars','avatars',true,2097152,array['image/png','image/jpeg','image/webp']),
       ('post-images','post-images',true,10485760,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,mime_types=excluded.mime_types;

drop policy if exists storage_avatars_insert on storage.objects;
drop policy if exists storage_avatars_update on storage.objects;
drop policy if exists storage_avatars_delete on storage.objects;
drop policy if exists storage_post_images_insert on storage.objects;
drop policy if exists storage_post_images_update on storage.objects;
drop policy if exists storage_post_images_delete on storage.objects;

create policy storage_avatars_insert on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_avatars_update on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_avatars_delete on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_post_images_insert on storage.objects for insert to authenticated with check (bucket_id='post-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_post_images_update on storage.objects for update to authenticated using (bucket_id='post-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_post_images_delete on storage.objects for delete to authenticated using (bucket_id='post-images' and (storage.foldername(name))[1]=auth.uid()::text);

-- Admin role foundation. Add user UUIDs manually to this table if you want a server-controlled admin allowlist.
create table if not exists public.admin_users (user_id uuid primary key references public.profiles(id) on delete cascade, created_at timestamptz default now());
alter table public.admin_users enable row level security;
drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self on public.admin_users for select using (auth.uid()=user_id);

-- Helpful search index when pg_trgm is available.
create extension if not exists pg_trgm;
create index if not exists posts_title_trgm_idx on public.posts using gin (title gin_trgm_ops);
create index if not exists posts_prompt_trgm_idx on public.posts using gin (prompt gin_trgm_ops);

-- Done.
