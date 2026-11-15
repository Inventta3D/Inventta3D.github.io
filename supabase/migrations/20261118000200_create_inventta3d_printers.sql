-- Impressoras e manutenção: horímetro (horas de impressão) e tarefas com intervalo em horas.
-- tasks: [{ "nome": "...", "intervalo_h": 200, "ultima_h": 0, "ultima_em": "2026-11-15" }]
-- log:   [{ "em": "2026-11-15", "tarefa": "...", "custo": 0 }] (o que foi feito e quanto custou)
create table if not exists public.inventta3d_printers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  model text not null default '' check (char_length(model) <= 60),
  hours numeric(10,1) not null default 0 check (hours >= 0),
  hours_at timestamptz not null default now(),
  tasks jsonb not null default '[]'::jsonb check (jsonb_typeof(tasks) = 'array'),
  log jsonb not null default '[]'::jsonb check (jsonb_typeof(log) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventta3d_printers enable row level security;

create policy inventta3d_printers_select_own on public.inventta3d_printers for select to authenticated using ((select auth.uid()) = owner_id);
create policy inventta3d_printers_insert_own on public.inventta3d_printers for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy inventta3d_printers_update_own on public.inventta3d_printers for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy inventta3d_printers_delete_own on public.inventta3d_printers for delete to authenticated using ((select auth.uid()) = owner_id);

create index if not exists inventta3d_printers_owner_idx on public.inventta3d_printers (owner_id, name);

create trigger inventta3d_printers_touch_updated_at before update on public.inventta3d_printers
  for each row execute function public.inventta3d_touch_updated_at();

revoke all on table public.inventta3d_printers from anon;
revoke all on table public.inventta3d_printers from authenticated;
grant select, insert, update, delete on table public.inventta3d_printers to authenticated;
