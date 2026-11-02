# EcoVerify com Supabase (login real, dados por conta)

Guia passo a passo para colocar o app de verdade no ar: **Supabase** (banco + fotos) e **Vercel** (o site/servidor),
e depois o **APK** abrindo esse servidor. Tudo no plano gratuito.

> **Resumo do que muda**
>
> | | APK de hoje (sem servidor) | Com Supabase + Vercel |
> | --- | --- | --- |
> | Onde ficam os dados | No próprio celular | No banco (Supabase) |
> | Login | Perfis prontos + cadastro no aparelho | **E-mail e senha de cada pessoa** |
> | Trocar de celular / usar no PC | Começa do zero | **Mesma conta, mesmos pontos, em qualquer aparelho** |
> | Ranking e chat | Usuários de exemplo | **Pessoas reais** |
> | Moderação | Simulada no aparelho | **Moderadores reais, da sua equipe** |

---

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com> → **New project**.
2. Nome: `ecoverify`. Região: **South America (São Paulo)**.
3. Crie uma **senha do banco** forte e guarde (ela vai na `DATABASE_URL`). Evite `@ # / ? %` na senha, ou
   lembre de codificar esses caracteres na URL.

## 2. Rodar os arquivos SQL (pasta [`supabase/`](../supabase))

No Supabase: **SQL Editor → New query**, cole o arquivo inteiro e clique em **Run**. Um de cada vez, nesta ordem:

| Arquivo | O que faz | Quando |
| --- | --- | --- |
| `01_schema.sql` | Cria todas as tabelas do app | Uma vez, no projeto novo |
| `02_seguranca.sql` | Liga o RLS e fecha a API pública (ninguém de fora lê o banco) | Logo depois do 01 |
| `03_storage.sql` | Cria o bucket **privado** `uploads` para as fotos | Uma vez |
| `04_missoes_iniciais.sql` | Missões prontas do Recife e de "qualquer lugar" | Opcional |
| `05_admin.sql` | Transforma a **sua** conta em admin | Depois do passo 5 |
| `06_comunidade_por_organizacao.sql` | Atualização: cada organização ganha o próprio chat da Comunidade | Só se você já rodou o 01 antes dessa versão (rode **antes** do merge) |
| `07_missoes_qualquer_lugar.sql` | 8 missões para fazer em qualquer cidade e país (só pontos) | Opcional, recomendado (pode repetir) |

Cada arquivo termina com uma consulta de conferência (você vê o resultado embaixo do editor).

> **Por que o RLS sem policies?** O app não usa o supabase-js no navegador: só o servidor fala com o banco, pela
> `DATABASE_URL`, como dono das tabelas. Com o RLS ligado e sem policies, a chave pública `anon` do Supabase não
> consegue ler nem gravar nada. O servidor continua funcionando normalmente.

## 3. Pegar as chaves no Supabase

| O quê | Onde | Vai em |
| --- | --- | --- |
| Connection string | **Connect** (botão no topo) → **Transaction pooler** (porta **6543**) | `DATABASE_URL` |
| Project URL | **Project Settings → API** (ou Data API) | `SUPABASE_URL` |
| service_role key | **Project Settings → API Keys** → `service_role` (secreta!) | `SUPABASE_SERVICE_ROLE_KEY` |

A connection string fica parecida com
`postgresql://postgres.abcdefgh:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
(troque `[YOUR-PASSWORD]` pela senha do passo 1).

> ⚠️ A `service_role` e a `DATABASE_URL` dão acesso total. Coloque **só** nas variáveis da Vercel. Nunca no
> código, no GitHub, no chat ou no app.

## 4. Colocar o app real na Vercel

O projeto da Vercel de hoje publica a **demonstração** (pasta `demo/`). Para o app real, crie **um projeto novo**
a partir do mesmo repositório (assim a demonstração continua no ar):

1. <https://vercel.com/new> → importe `dg-senac/EcoVerify`.
2. Nome: por exemplo `ecoverify-app` (o endereço vira `https://ecoverify-app.vercel.app`).
3. **Framework Preset: Next.js**. Deixe Build Command e Output Directory **no padrão** (não use `demo:build`).
4. Em **Environment Variables**, cadastre:

| Variável | Valor | Obrigatória |
| --- | --- | --- |
| `DATABASE_URL` | Connection string do pooler (passo 3) | ✅ |
| `DATABASE_POOL_MAX` | `3` (a Vercel abre várias instâncias; poucas conexões por instância) | ✅ |
| `SUPABASE_URL` | Project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | ✅ |
| `SUPABASE_STORAGE_BUCKET` | `uploads` | ✅ |
| `ADMIN_EMAILS` | **O seu e-mail** (um só). Só ele pode ser admin | ✅ |
| `APP_URL` | `https://ecoverify-app.vercel.app` (o endereço do passo 2) | ✅ |
| `SERVER_ACTIONS_ALLOWED_ORIGINS` | `ecoverify-app.vercel.app` (sem https) | ✅ |
| `LEGAL_CONTROLLER_NAME` / `LEGAL_CONTACT_EMAIL` | Seu nome e e-mail de contato (Política de Privacidade) | ✅ |
| `GEMINI_API_KEY` | Chave grátis do Google AI Studio (análise das fotos) | Recomendada |
| `CRON_SECRET` | Uma senha longa qualquer (ver passo 7) | Recomendada |
| `RESEND_API_KEY` + `EMAIL_FROM` | Envio de e-mails (confirmação e "esqueci a senha") | Opcional |
| `MODERATORS_ENABLED` | Deixe vazio (moderadores ligados). `false` desliga o papel | — |

5. **Deploy**. Abra o endereço: deve aparecer a tela de login.

> **Velocidade: servidor perto do banco.** O `vercel.json` manda as funções rodarem em `pdx1` (Portland, EUA),
> a mesma região do banco `us-west-2` (Oregon). Cada página faz várias consultas: com servidor e banco longe um do
> outro, cada consulta atravessa os EUA e o app fica lento. Se o seu Supabase estiver em outra região, troque o
> `regions` do `vercel.json` pela região mais próxima dele (ex.: `sa-east-1` São Paulo → `gru1`,
> `us-east-1` → `iad1`).

> **Sem Resend** o app funciona: ninguém precisa confirmar e-mail, mas "esqueci minha senha" não envia link.
> Com Resend (grátis até 3.000 e-mails/mês) as duas coisas funcionam.

## 5. Criar a sua conta de admin (e-mail e senha só seus)

1. No app (`https://ecoverify-app.vercel.app`), toque em **Criar conta** e use **o mesmo e-mail do `ADMIN_EMAILS`**
   e uma senha forte. A senha fica só com você (o banco guarda apenas o hash).
2. No Supabase, abra `05_admin.sql`, troque `SEU_EMAIL@exemplo.com` pelo seu e-mail e rode.
3. Saia e entre de novo: você cai no painel **Admin**.

Com o Resend configurado, o passo 2 nem é preciso: ao confirmar o e-mail, a conta do `ADMIN_EMAILS` vira admin
sozinha. Como o `ADMIN_EMAILS` tem um e-mail só, **ninguém mais consegue virar admin**, nem pelo painel.

## 6. Moderadores (a sua equipe)

Sem SQL: entre como admin → **Admin → Usuários** → na pessoa da equipe, mude o papel para **Moderador**.

- A pessoa precisa ter criado a conta dela no app antes (com o e-mail e a senha dela).
- O moderador **continua usando o app como cidadão** (missões, ranking, chat, benefícios) e ganha a tela
  **Moderação**: revisa comprovações e dá cartão amarelo. **Nunca** revisa as próprias comprovações.
- Cartão vermelho, suspensão, banimento e FONE continuam só com o admin.
- Para tirar, volte o papel para **Cidadão**.

## 7. Verificação automática (recomendado)

As comprovações são verificadas sozinhas numa janela de tempo. Para isso rodar mesmo quando ninguém abre o app,
crie um agendamento grátis em <https://cron-job.org>:

- URL: `https://ecoverify-app.vercel.app/api/cron/verify`
- A cada **15 minutos**
- Header: `Authorization` = `Bearer SEU_CRON_SECRET` (o mesmo valor da variável `CRON_SECRET`)

Sem isso o app também verifica, só que quando alguém abre a Moderação ou "Meus envios".

## 8. APK abrindo o app real (login de verdade no celular)

1. GitHub → repositório → **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Nome: `CAPACITOR_SERVER_URL`
   - Valor: `https://ecoverify-app.vercel.app`
2. **Actions → Build Android APK → Run workflow** (ou faça qualquer merge na `main`).
3. Baixe o novo `app-debug.apk` na Release criada. Esse APK abre o servidor: cada pessoa entra com o
   **e-mail e a senha dela**, e os dados são os mesmos no celular, no PC ou em outro aparelho.

Para voltar ao APK sem servidor (para testes), apague a variável e rode o workflow de novo.

## Carteira Fone (opcional)

No cadastro existe o campo **"Endereço da carteira Fone (opcional)"**. Pode deixar em branco e adicionar, trocar
ou remover depois em **Perfil → Carteira Fone**. Só maiores de 18 anos podem informar (o app pede a confirmação).
O endereço fica guardado como **informado**, não como verificado: antes de qualquer envio de FONE, quando os
pagamentos forem ligados, o app pede a prova de que a carteira é da pessoa (uma pequena transferência a partir
dela) e o campo já vem preenchido.

## Quando mudar o banco no futuro

O arquivo `01_schema.sql` é gerado a partir de `src/db/schema.ts`:

```bash
npm run supabase:schema   # regenera supabase/01_schema.sql
```

Num banco que **já tem dados**, não rode o 01 de novo. Aplique só a diferença:

```bash
# no seu computador, com a connection string do Supabase em DATABASE_URL (Session pooler, porta 5432)
npm run db:push
```

Depois rode o `02_seguranca.sql` de novo (ele liga o RLS nas tabelas novas). Ele pode ser rodado quantas vezes
quiser.

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Erro 500 em todas as páginas | `DATABASE_URL` errada (senha, porta 6543) ou o 01_schema.sql não foi rodado |
| `password authentication failed` | Senha com caractere especial sem codificar na URL |
| Fotos não aparecem / erro ao enviar | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ou o bucket `uploads` (03_storage.sql) |
| Não consigo virar admin | `ADMIN_EMAILS` diferente do e-mail da conta, ou falta rodar o 05_admin.sql |
| Moderador não vê "Moderação" | Papel não foi trocado em Admin → Usuários, ou `MODERATORS_ENABLED=false` |
| App lento | Região da Vercel longe da região do banco: ajuste `regions` no `vercel.json` (ver passo 4) |
| Erro na Comunidade depois de atualizar | Faltou rodar o `06_comunidade_por_organizacao.sql` |
| Banco "pausado" | O plano grátis do Supabase pausa após 7 dias sem uso: entre no painel e clique em **Restore** |
