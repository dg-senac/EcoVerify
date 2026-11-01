-- =====================================================================
-- EcoVerify · 2/5 · Segurança (rode logo depois do 01_schema.sql)
--
-- O app NÃO usa a API pública do Supabase (PostgREST / supabase-js no navegador).
-- Ele conversa com o banco só pelo servidor, com a connection string (DATABASE_URL),
-- como dono das tabelas. Então a regra aqui é simples: ninguém de fora lê nada.
--
-- 1. Liga o RLS (Row Level Security) em todas as tabelas, sem nenhuma policy:
--    a chave "anon" e usuários "authenticated" do Supabase ficam sem acesso.
-- 2. Tira as permissões padrão dos papéis anon/authenticated nas tabelas,
--    sequências e funções do schema public (inclusive das que forem criadas depois).
--
-- O servidor do app continua funcionando normalmente: o dono das tabelas (postgres)
-- não é afetado pelo RLS. Pode rodar de novo sem problema (é idempotente).
-- =====================================================================

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all sequences in schema public from anon';
    execute 'revoke all on all functions in schema public from anon';
    execute 'alter default privileges in schema public revoke all on tables from anon';
    execute 'alter default privileges in schema public revoke all on sequences from anon';
    execute 'alter default privileges in schema public revoke all on functions from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from authenticated';
    execute 'revoke all on all sequences in schema public from authenticated';
    execute 'revoke all on all functions in schema public from authenticated';
    execute 'alter default privileges in schema public revoke all on tables from authenticated';
    execute 'alter default privileges in schema public revoke all on sequences from authenticated';
    execute 'alter default privileges in schema public revoke all on functions from authenticated';
  end if;
end
$$;

-- Conferência: deve listar todas as tabelas com rls_ligado = true.
select tablename, rowsecurity as rls_ligado
from pg_tables
where schemaname = 'public'
order by tablename;
