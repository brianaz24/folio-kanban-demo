-- Folio: initial migration for a NEW Supabase project.
-- Run once in the Supabase SQL editor as the project database administrator.
-- Anonymous sign-in must also be enabled in Authentication > Sign In / Providers.
-- Guest sessions use the authenticated Postgres role, NOT the anon role.
-- This migration intentionally fails on existing tables rather than silently
-- accepting an unknown or weaker pre-existing schema. Everything is atomic.
begin;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text not null default '' check (char_length(description) <= 10000),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  due_date date,
  labels text[] not null default '{}'::text[]
    check (cardinality(labels) <= 20 and array_position(labels, null) is null),
  -- A display name within the guest's private workspace, not another login.
  assignee text not null default '' check (char_length(assignee) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_owner_created_idx on public.tasks (user_id, created_at desc);
create index tasks_owner_status_idx on public.tasks (user_id, status);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index comments_task_created_idx on public.comments (task_id, created_at);
create index comments_owner_idx on public.comments (user_id);

create function public.folio_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.folio_set_updated_at() from public, anon, authenticated;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.folio_set_updated_at();

alter table public.tasks enable row level security;
alter table public.tasks force row level security;
alter table public.comments enable row level security;
alter table public.comments force row level security;

-- No access to either table without a valid signed-in user JWT.
revoke all on public.tasks, public.comments from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on public.tasks to authenticated;
grant update (title, description, status, priority, due_date, labels, assignee)
  on public.tasks to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

create policy tasks_select_own on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- A comment must belong to the caller AND to a task owned by that caller.
-- The task EXISTS query is itself subject to tasks RLS.
create policy comments_select_own on public.comments for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tasks t
                where t.id = comments.task_id and t.user_id = (select auth.uid()))
  );
create policy comments_insert_own on public.comments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tasks t
                where t.id = comments.task_id and t.user_id = (select auth.uid()))
  );
create policy comments_update_own on public.comments for update to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tasks t
                where t.id = comments.task_id and t.user_id = (select auth.uid()))
  )
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tasks t
                where t.id = comments.task_id and t.user_id = (select auth.uid()))
  );
create policy comments_delete_own on public.comments for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tasks t
                where t.id = comments.task_id and t.user_id = (select auth.uid()))
  );
commit;
