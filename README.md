# 🌱 EcoVerify

**Ações sustentáveis reais, verificadas e recompensadas em FONE.**

O EcoVerify conecta ações sustentáveis do mundo real (reciclagem, plantio de árvores, doação de roupas, mutirões de limpeza) a recompensas na criptomoeda **FONE**, da [Fone Protocol](https://fone.dev).

> 🥉 **3º lugar no Fone Protocol SDK Hackathon (2025)**. Projeto de Douglas Gabriel, aluno do Mediotec do Senac Recife.
> [Matéria do Senac‑PE](https://www.pe.senac.br/aluno-do-mediotec-do-senac-recife-e-finalista-em-hackathon-internacional/)

---

## Como funciona

1. **Cadastro + carteira FONE**: o usuário cria a conta e vincula sua carteira FONE.
2. **Missões**: o admin cadastra missões com local no mapa, pontos e recompensa em FONE.
3. **Comprovação no local**: o usuário vai até o ponto da missão (raio de 150 m, com checagem da precisão do GPS), tira uma foto e escreve um relato.
4. **Moderação**: moderadores aprovam ou rejeitam. A aprovação credita os pontos e coloca o FONE na fila de pagamento, sempre uma única vez por comprovação.
5. **Ranking e comunidade**: níveis (🌱 Iniciante → 👑 Lenda Verde), ranking público e chat da comunidade com imagens, áudio, vídeo e GIFs.

Perfis: **cidadão**, **moderador** e **admin**. Idiomas: 🇧🇷 PT · 🇺🇸 EN · 🇪🇸 ES. Acessibilidade: tamanho de fonte, alto contraste e redução de movimento.

## Stack

| Camada | Tecnologia |
|---|---|
| Web | Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4 |
| Banco | PostgreSQL (Supabase) + Drizzle ORM |
| Arquivos | Supabase Storage (produção) ou disco local (desenvolvimento) |
| Android | Capacitor 8: WebView apontando para o app web **ou** demo offline embutida (`demo/`) |

## Rodando localmente

Pré‑requisitos: **Node.js 20.9+** e um **PostgreSQL** (local ou Supabase).

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL (use DATABASE_SSL=disable para Postgres local)
npm run db:push             # cria as tabelas
npm run db:seed             # opcional: usuários e missões de exemplo em Recife
npm run dev                 # http://localhost:3000
```

O seed cria `admin@ecoverify.dev`, `moderador@ecoverify.dev` e `cidada@ecoverify.dev` (senha definida em `SEED_PASSWORD`, padrão `ecoverify123`). Não rode o seed em produção.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` / `npm run typecheck` / `npm run check` | Qualidade de código |
| `npm run db:push` | Aplica o schema (`src/db/schema.ts`) no banco |
| `npm run db:generate` / `npm run db:migrate` | Migrations versionadas em `./drizzle` |
| `npm run db:studio` | Interface visual do banco |
| `npm run db:seed` | Dados de demonstração |
| `npm run demo:dev` / `npm run demo:build` | Demo offline (sem servidor e sem banco) usada no APK de demonstração |

## Variáveis de ambiente

Veja [`.env.example`](.env.example). As principais:

- `DATABASE_URL`: conexão Postgres.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (+ `SUPABASE_STORAGE_BUCKET`, padrão `uploads`): armazenamento das fotos em produção. Crie o bucket como **privado**. Os arquivos são servidos por `/api/files/...` apenas para usuários logados.
- `SERVER_ACTIONS_ALLOWED_ORIGINS`: domínio de produção (ex.: `ecoverify.app`).
- `CAPACITOR_SERVER_URL`: URL HTTPS do app web, usada no build Android. **Opcional**: sem ela, o APK é gerado com a demo offline.

## Atualizando um banco já existente

Esta versão adiciona **índices únicos** que impedem pagamento em dobro, carteira repetida e foto duplicada. Antes do `db:push` em produção:

1. Rode [`scripts/pre-migration-check.sql`](scripts/pre-migration-check.sql) no SQL Editor do Supabase. Todas as consultas devem voltar vazias.
2. Corrija o que aparecer (há exemplos no próprio arquivo).
3. Rode `npm run db:push`.

## Segurança e antifraude

- Aprovação **atômica** (transação + update condicional) e índices únicos: uma comprovação nunca gera pontos ou FONE duas vezes, nem com cliques ou moderadores simultâneos.
- Fotos validadas pelo **conteúdo real do arquivo** (magic bytes), hash SHA‑256 contra reuso, limite de 5 envios por dia, raio de 150 m e precisão mínima do GPS.
- Uploads só para usuários logados, armazenados fora de `public/` e servidos com `nosniff` e CSP restritiva.
- Limite de tentativas no login, no cadastro, no chat e no upload. Senha mínima de 8 caracteres.
- Banimento derruba todas as sessões na hora.
- Uma carteira por conta. Pagamento só pode ser marcado como "pago" com o hash da transação.

Detalhes e próximos passos: [`docs/RECOMENDACOES.md`](docs/RECOMENDACOES.md).

## Android

O APK tem dois modos:

- **Demo offline** (padrão, quando `CAPACITOR_SERVER_URL` não está configurada): o app roda inteiro no celular, sem internet, servidor ou banco. Tem perfis prontos (cidadão, moderador e admin), as missões do Recife, ranking e chat com usuários fictícios, e saldo de FONE **simulado**. Ideal para testes e apresentações.
- **Servidor**: com `CAPACITOR_SERVER_URL` (HTTPS), o APK abre o app web real.

Para testar a demo no navegador: `npm run demo:dev` (http://localhost:5173).

Veja [`BUILD_ANDROID.md`](BUILD_ANDROID.md). O app declara as permissões de **localização**, **câmera** e **microfone**, necessárias para comprovar missões no local e gravar áudios no chat.

## CI

- **CI** (`.github/workflows/ci.yml`): lint, typecheck, auditoria de dependências, build do app web e da demo offline em todo PR.
- **Build Android APK** (`.github/workflows/build-android.yml`): gera o APK debug a cada push na `main`, no modo demo ou servidor conforme `CAPACITOR_SERVER_URL`. O modo aparece no resumo da execução e no título da Release.

## Roadmap

- [ ] Integração direta com o SDK FONE (criar/importar carteira, saldo, envio automático dos pagamentos)
- [ ] Prova de posse da carteira (assinatura)
- [ ] Hash da comprovação registrado on‑chain (rastreabilidade pública)
- [ ] Antifraude avançado: hash perceptual, EXIF, foto só pela câmera do app, pré‑triagem com IA
- [ ] Validação comunitária com reputação
- [ ] Painel de patrocinadores e página pública de impacto
