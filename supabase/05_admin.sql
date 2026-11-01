-- =====================================================================
-- EcoVerify · 5/5 · Seu acesso de administrador (rode por último)
--
-- O admin é uma conta normal do app, com o SEU e-mail e a SUA senha:
--
--   1. Na Vercel, defina ADMIN_EMAILS com o seu e-mail (só um). Com isso, só esse
--      e-mail pode ser admin: ninguém mais consegue virar admin, nem pelo painel.
--   2. Abra o app e crie sua conta em "Criar conta" com esse e-mail e uma senha forte.
--      (A senha nunca passa por aqui: ela fica só com você, guardada com hash no banco.)
--   3. Troque SEU_EMAIL@exemplo.com abaixo pelo seu e-mail e rode este arquivo.
--   4. Saia e entre de novo no app: você cai direto no painel Admin.
--
-- Se o envio de e-mails (Resend) estiver configurado, os passos 3 e 4 nem são
-- necessários: ao confirmar o e-mail, a conta do ADMIN_EMAILS vira admin sozinha.
--
-- Moderadores: NÃO use SQL. No app, entre como admin → Admin → Usuários → escolha
-- a pessoa da sua equipe → papel "Moderador". Ela continua usando o app como
-- cidadã e ganha a tela de Moderação.
-- =====================================================================

update public.users
set role = 'admin',
    email_verified_at = coalesce(email_verified_at, now())
where email = lower(trim('SEU_EMAIL@exemplo.com'))
  and deleted_at is null;

-- Conferência: deve aparecer só você.
select name, email, role, email_verified_at
from public.users
where role = 'admin';
