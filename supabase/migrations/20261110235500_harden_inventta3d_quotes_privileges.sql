-- Visitantes sem login não têm nenhum acesso à tabela.
revoke all on table public.inventta3d_quotes from anon;

-- Usuários logados ficam só com o que o app usa (as políticas RLS limitam ao dono do registro).
-- TRUNCATE não passa pelas políticas RLS, então não deve ser concedido.
revoke truncate, references, trigger on table public.inventta3d_quotes from authenticated;

grant select, insert, update, delete on table public.inventta3d_quotes to authenticated;
