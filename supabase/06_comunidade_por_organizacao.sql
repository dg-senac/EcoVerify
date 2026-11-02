-- =====================================================================
-- EcoVerify · 6 · Comunidade por organização (atualização)
--
-- Para quem JÁ rodou os arquivos 01 a 05. Cada organização passa a ter
-- o próprio chat da Comunidade, só com os membros dela. Quem não está em
-- nenhuma organização não vê a aba Comunidade.
--
-- Rode este arquivo ANTES de colocar a nova versão do app no ar (antes do
-- merge). Ele só adiciona uma coluna e um índice: a versão atual do app
-- continua funcionando normalmente depois dele.
--
-- Pode rodar mais de uma vez sem problema.
-- As mensagens do antigo chat geral (sem organização) ficam guardadas, mas
-- deixam de aparecer no app.
-- =====================================================================

alter table public.community_chat
  add column if not exists organization_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'community_chat_organization_id_organizations_id_fk'
  ) then
    alter table public.community_chat
      add constraint community_chat_organization_id_organizations_id_fk
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;
end $$;

create index if not exists community_chat_org_created_idx
  on public.community_chat using btree (organization_id, created_at);

-- Conferência: deve mostrar a coluna organization_id (uuid).
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'community_chat'
  and column_name = 'organization_id';
