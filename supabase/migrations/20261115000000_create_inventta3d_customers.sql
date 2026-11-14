create table if not exists public.inventta3d_customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null default '' check (char_length(email) <= 120),
  phone text not null default '' check (char_length(phone) <= 15),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventta3d_customers enable row level security;

drop policy if exists inventta3d_customers_select_own on public.inventta3d_customers;
create policy inventta3d_customers_select_own
  on public.inventta3d_customers for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists inventta3d_customers_insert_own on public.inventta3d_customers;
create policy inventta3d_customers_insert_own
  on public.inventta3d_customers for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists inventta3d_customers_update_own on public.inventta3d_customers;
create policy inventta3d_customers_update_own
  on public.inventta3d_customers for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists inventta3d_customers_delete_own on public.inventta3d_customers;
create policy inventta3d_customers_delete_own
  on public.inventta3d_customers for delete to authenticated
  using (auth.uid() = owner_id);

create index if not exists inventta3d_customers_owner_name_idx
  on public.inventta3d_customers (owner_id, name);

-- Visitantes sem login não têm acesso. Usuários logados ficam só com o que o app usa
-- (as políticas RLS limitam ao dono do registro; TRUNCATE não passa pelas políticas, então não é concedido).
revoke all on table public.inventta3d_customers from anon;
revoke all on table public.inventta3d_customers from authenticated;
grant select, insert, update, delete on table public.inventta3d_customers to authenticated;
