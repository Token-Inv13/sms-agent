create table if not exists public.conversations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigserial primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.configs (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_name text not null,
  persona text not null,
  gender text not null,
  context text not null,
  updated_at timestamptz not null default now()
);

create index if not exists configs_user_id_idx on public.configs (user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists configs_set_updated_at on public.configs;
create trigger configs_set_updated_at before update on public.configs
for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.configs enable row level security;

create policy conversations_select on public.conversations
  for select using (auth.uid() = user_id);

create policy conversations_insert on public.conversations
  for insert with check (auth.uid() = user_id);

create policy conversations_update on public.conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy conversations_delete on public.conversations
  for delete using (auth.uid() = user_id);

create policy messages_select on public.messages
  for select using (auth.uid() = user_id);

create policy messages_insert on public.messages
  for insert with check (auth.uid() = user_id);

create policy messages_delete on public.messages
  for delete using (auth.uid() = user_id);

create policy configs_select on public.configs
  for select using (auth.uid() = user_id);

create policy configs_insert on public.configs
  for insert with check (auth.uid() = user_id);

create policy configs_update on public.configs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
