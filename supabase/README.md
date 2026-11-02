# Arquivos SQL do Supabase

Rode no **Supabase → SQL Editor**, um por vez, nesta ordem. O passo a passo completo (chaves, Vercel, APK) está em
[`docs/SUPABASE.md`](../docs/SUPABASE.md).

1. `01_schema.sql`: tabelas do app (uma vez, projeto novo). Gerado de `src/db/schema.ts` com `npm run supabase:schema`.
2. `02_seguranca.sql`: RLS ligado e API pública fechada (pode repetir).
3. `03_storage.sql`: bucket privado `uploads` para as fotos (pode repetir).
4. `04_missoes_iniciais.sql`: missões prontas (opcional, pode repetir).
5. `05_admin.sql`: sua conta vira admin (depois de criar a conta no app com o e-mail do `ADMIN_EMAILS`).

## Atualizações (para quem já rodou 01–05)

- `06_comunidade_por_organizacao.sql`: cada organização ganha o próprio chat da Comunidade. Rode **antes** de
  colocar no ar a versão que traz essa mudança (pode repetir). Em projeto novo não precisa: o `01_schema.sql` já
  inclui a coluna.
- `07_missoes_qualquer_lugar.sql`: 8 missões novas que valem em qualquer cidade e país (só pontos, comprovadas
  por foto). Não muda tabelas; pode rodar antes ou depois do merge e pode repetir. Em projeto novo também vale
  rodar (depois do `04`).

Moderadores não precisam de SQL: o admin escolhe em **Admin → Usuários**.
