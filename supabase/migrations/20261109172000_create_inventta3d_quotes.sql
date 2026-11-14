create table if not exists public.inventta3d_quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Orçamento',
  client_name text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  items jsonb not null default '[]'::jsonb,
  share_mode text not null default 'summary' check (share_mode in ('summary', 'detailed')),
  discount_mode text not null default 'percent' check (discount_mode in ('percent', 'fixed')),
  discount_input numeric(12,2) not null default 0 check (discount_input >= 0),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  discount_percent numeric(7,3) not null default 0 check (discount_percent >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventta3d_quotes enable row level security;

drop policy if exists inventta3d_quotes_select_own on public.inventta3d_quotes;
create policy inventta3d_quotes_select_own
  on public.inventta3d_quotes for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists inventta3d_quotes_insert_own on public.inventta3d_quotes;
create policy inventta3d_quotes_insert_own
  on public.inventta3d_quotes for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists inventta3d_quotes_update_own on public.inventta3d_quotes;
create policy inventta3d_quotes_update_own
  on public.inventta3d_quotes for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists inventta3d_quotes_delete_own on public.inventta3d_quotes;
create policy inventta3d_quotes_delete_own
  on public.inventta3d_quotes for delete to authenticated
  using (auth.uid() = owner_id);

grant select, insert, update, delete on table public.inventta3d_quotes to authenticated;
create index if not exists inventta3d_quotes_owner_created_idx
  on public.inventta3d_quotes (owner_id, created_at desc);
