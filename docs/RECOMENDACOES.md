# EcoVerify: diagnóstico e recomendações

> Análise feita em 25/10/2026 sobre o commit `7699979` (`main`).
> **Atualização:** a Fase 0 foi implementada no branch `arena/5311dd98-ecoverify`. Veja o status abaixo.
> Objetivo: deixar o EcoVerify pronto para uso real e para ser apresentado à Fone Protocol como produto, não só como projeto de hackathon.

---


## ✅ Status da implementação (Fase 0)

| Item | Status | Onde |
|---|---|---|
| C1: build quebrado | ✅ Corrigido (`npm run build`, lint e typecheck limpos) | `icons.tsx`, `schema.ts` |
| C2: carteira | ✅ Carteira falsa removida. Só endereço FONE nativo da Fone Wallet, com **prova de posse** (transferência de valor exato para a carteira de verificação, conferida pelo admin) e declaração 18+. **Falta** automatizar a conferência quando sair o SDK/API | `actions/wallet.ts`, `lib/fone.ts`, Admin → Carteiras |
| C3: pagamento manual | 🟡 Parcial: só para carteira verificada, em lote por pessoa, hash de 64 hex único por pessoa, destino/data/admin registrados, notificação e histórico com explorer. **Falta** o envio automático via SDK | `actions/admin.ts`, Admin → Recompensas |
| C4: aprovação duplicada | ✅ Transação + update condicional + índices únicos | `actions/moderation.ts`, `schema.ts` |
| C5: upload inseguro | ✅ Exige login, valida magic bytes, extensão pelo conteúdo, rate limit | `api/upload`, `lib/file-type.ts` |
| C6: arquivos em `public/` | ✅ Supabase Storage (prod) ou disco local, servidos por `/api/files` com login | `lib/storage.ts` |
| C7: Next.js vulnerável | ✅ Next 16.4.3, `npm audit --omit=dev` = 0 vulnerabilidades | `package.json` |
| C8: permissões Android | ✅ Localização, câmera, microfone | `AndroidManifest.xml` |
| A1: GPS falsificável | 🟡 Parcial: rejeita leituras com precisão pior que 150 m | `actions/submissions.ts` |
| A3: contas múltiplas | 🟡 Parcial: limite de cadastros por IP, senha de 8+ caracteres, carteira única | `actions/auth.ts` |
| A4: ban não derruba sessão | ✅ Sessões apagadas + `getCurrentUser` bloqueia banidos | `lib/auth.ts`, `actions/admin.ts` |
| A5: força bruta | ✅ Limite por e‑mail e IP | `lib/rate-limit.ts` |
| Chat | ✅ Mensagens mais recentes, conteúdo apagado não vaza, notificação em 1 query sem spam, mídia só do app/Giphy, citação vinda do banco, polling pausa em segundo plano | `lib/community.ts`, `actions/community.ts` |
| Missões | ✅ Rejeitada pode ser reenviada; pendente/aprovada não | `missions/page.tsx`, `actions/submissions.ts` |
| Admin | ✅ Valida categoria, cargo, status, teto de pontos/FONE | `actions/admin.ts` |
| Infra | ✅ CI (lint, typecheck, audit, build), `.env.example`, `drizzle.config.ts` via env, seed com missões em Recife, script de checagem pré‑migração, README, headers de segurança | vários |

**Fase 1 / Parte 1 (carteira de verdade, v1.2):** pagamentos só para carteira verificada, agrupados por pessoa com um hash por envio (validado e nunca reaproveitado), destino registrado e histórico com links do explorer. Testado ponta a ponta contra Postgres com **60 cenários** de carteira e pagamento, incluindo migração de dados antigos.

Testado ponta a ponta contra Postgres + build de produção: **52 cenários** (cadastro, carteira, upload, comprovação, aprovação concorrente, chat, admin, banimento, força bruta) e renderização de todas as páginas nos 3 perfis.

> ⚠️ Antes de publicar em produção, rode `scripts/pre-migration-check.sql` no Supabase e depois `npm run db:push` (detalhes no README).

---

## 1. Resumo executivo

O EcoVerify tem **uma boa base de produto**: missões com geolocalização, envio de comprovação com foto, moderação, ranking, comunidade, painel de admin, 3 idiomas e app Android via Capacitor. A ideia já foi validada pelo mercado: **3º lugar no SDK Hackathon da Fone** e cobertura do Senac‑PE.

Hoje, porém, ele **ainda não funciona como produto real**. Três coisas pesam mais:

1. **O build de produção quebra.** `npm run build` falha por erros de TypeScript (ícones que não existem no `lucide-react`). Do jeito que está, a `main` não pode ser publicada.
2. **Não há integração real com a blockchain FONE.** A "carteira" é um texto aleatório (`"0xFONE" + hex`) e o pagamento é uma fila manual em que o admin digita o hash da transação à mão. O hackathon era justamente de **SDK** (criar e importar carteira, saldo, enviar e receber FONE), e essa integração não está neste repositório.
3. **Faltam proteções antifraude e de segurança** para um app que paga cripto: dá para aprovar a mesma comprovação duas vezes, a localização é informada pelo próprio usuário (fácil de falsificar), qualquer um pode cadastrar a carteira de outra pessoa e o upload não exige login.

**Ponto de atenção sobre prazo:** pelo anúncio oficial, o prêmio (5M + 2,5M FONE) tem **vesting de 12 meses** e só continua liberado se houver *desenvolvimento ativo durante o ano*. O resultado saiu em 08/12/2025, então a janela vai até **~dezembro de 2026**. Mostrar evolução visível nas próximas semanas protege esse prêmio e prepara a venda.

---

## 2. Contexto estratégico (o que a Fone quer)

| Fato | Fonte | O que significa para o EcoVerify |
|---|---|---|
| 3º lugar: 5M FONE + 2,5M pela fase de votação, **vesting de 12 meses** condicionado a desenvolvimento contínuo | news.fone.dev/2025/12/08/sdk-hackathon-winners | Precisa haver entregas públicas e frequentes até dez/2026 |
| O link oficial do EcoVerify no post de votação é `douglas-sketch.github.io/eco-verify` | news.fone.dev/2025/12/01/sdk-hackathon-voting | Hoje esse link mostra só uma landing "🚀 MVP em Finalização". Quem chega pela Fone não vê o app |
| SDK por API: semana 1 (criar/importar carteira, saldo), semana 2 (enviar/receber, histórico) | Posts da Fone no X / news.fone.dev | Exatamente o que falta no código atual |
| A Fone planeja liberar o SDK público pelo Fone Wallet depois da reestruturação nos Emirados Árabes; roadmap tem **Node 2.0**, **SDK Global Release**, **Fone Shop**, **Mobile Payments** | fone.dev (roadmap) | A integração deve ser feita atrás de uma camada própria (adapter), porque a API vai mudar com o Node 2.0 |
| A Fone já tem um app verde: **Green Karma** (compensação de CO2 com cards, certificados, FONE/BCT), e "Green Karma Node 2.0 update" é prioridade de **outubro/2026** | fone.dev, Google Play | **Não concorra com o Green Karma: complemente.** O Green Karma compensa CO2 de forma virtual; o EcoVerify **verifica ações físicas reais**. Essa é a proposta de venda |

### Posicionamento sugerido para o pitch

> **"EcoVerify é a camada de Prova de Impacto Real (Proof‑of‑Impact) do ecossistema Fone."**
> Cada ação sustentável física (reciclar, plantar, doar, limpar) é verificada, registrada na blockchain FONE (hash da prova nos metadados da transação) e recompensada. Ações verificadas podem virar cards e certificados do Green Karma, e os FONE ganhos podem ser gastos no Fone Shop.

Para a Fone, isso gera **utilidade real para o token**, **usuários novos fora do público cripto** (escolas, prefeituras, empresas com metas ESG), **volume de transações** e **uma história forte com o Brasil e o Nordeste**.

---

## 3. Diagnóstico técnico

### 🔴 Crítico (bloqueia produção ou envolve dinheiro)

| # | Problema | Onde | Correção sugerida |
|---|---|---|---|
| C1 | **Build quebra**: 10 erros de TypeScript (`FileUnlock`, `Settings4`, `Settings5`, `CircleInfo`, `RepeatOne`, `Desktop` não existem no lucide; tipos recursivos no `communityChat`, que derrubam também os `insert` de `missions` e `submissions`) | `src/components/ui/icons.tsx`, `src/db/schema.ts` | Remover ou renomear os ícones, tipar o self‑reference (`(): AnyPgColumn => communityChat.id`) e rodar typecheck no CI |
| C2 | **Carteira falsa**: `generateWalletAddress()` gera `0xFONE…` aleatório, e `importWallet` aceita qualquer texto com 6+ caracteres | `src/lib/actions/wallet.ts` | Integrar o SDK FONE (criar/importar/saldo) e **provar que o usuário é dono da carteira** (assinatura de mensagem ou fluxo pelo Fone Wallet). Adicionar `UNIQUE(wallet_address)` |
| C3 | **Pagamento manual**: `reward_queue` só muda quando o admin digita status e txHash. A rede padrão é `"EcoChain"` (não existe) | `src/lib/actions/admin.ts`, `schema.ts` | Worker de pagamento usando o SDK (carteira‑tesouro, idempotência por `submission_id`, limite diário de orçamento, retentativas, status `paid` só com tx confirmada) |
| C4 | **Aprovação duplicada**: dois moderadores (ou dois cliques) aprovam a mesma submissão e o usuário recebe pontos e FONE em dobro. Não há transação nem `WHERE status='pending'` no update | `src/lib/actions/moderation.ts` | `db.transaction()` + `UPDATE … WHERE id=? AND status='pending' RETURNING`. Índices `UNIQUE(submission_id)` em `reward_queue` e `points_ledger` |
| C5 | **Upload sem login e com extensão vinda do nome do arquivo** (dá para mandar `.html` com MIME `image/png`, o que abre risco de XSS no próprio domínio) | `src/app/api/upload/route.ts` | Exigir sessão, validar os *magic bytes*, definir a extensão pelo tipo real e limitar a taxa de envio |
| C6 | **Arquivos salvos em `public/uploads` em tempo de execução.** O Next.js só serve o que estava em `public/` no build, e em hospedagem serverless (ex.: Vercel) o disco é efêmero. Em produção, as fotos de comprovação somem ou não aparecem | `submissions.ts`, `api/upload` | Mover para **Supabase Storage** ou S3, com URLs assinadas para fotos de comprovação |
| C7 | **Next.js 16.2.6 com vulnerabilidades críticas** (bypass de middleware/proxy, SSRF e DoS em Server Actions, entre outras) | `package.json` | Atualizar para `next@16.4.3`+ e rodar `npm audit fix`. Também há alertas em `sharp`, `postcss` e `uuid` (via `@capacitor/cli`) |
| C8 | **App Android sem permissão de localização/câmera** no `AndroidManifest.xml` (só `INTERNET`). Como a submissão exige GPS dentro de 150 m, **no APK provavelmente não dá para enviar nenhuma comprovação** | `android/app/src/main/AndroidManifest.xml` | Adicionar `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` e `CAMERA`, e usar os plugins `@capacitor/geolocation` e `@capacitor/camera` |

### 🟠 Alto (antifraude: essencial em app que paga cripto)

| # | Problema | Correção |
|---|---|---|
| A1 | GPS informado pelo navegador é **falsificável** (basta mandar latitude/longitude no form) | No app: GPS nativo + checagem de "mock location" no Android. No servidor: cruzar com o EXIF da foto, horário e velocidade entre envios. Usar Play Integrity API |
| A2 | Duplicidade de foto só por **SHA‑256 exato**: recomprimir ou cortar 1 pixel já burla | Hash perceptual (pHash/dHash), checagem de EXIF (data e GPS) e foto **tirada dentro do app** (sem galeria) para missões de alto valor |
| A3 | **Contas múltiplas (sybil)**: cadastro só com e‑mail, sem verificação e senha de 6 caracteres. Uma pessoa cria 10 contas e multiplica o FONE | Verificação de e‑mail/telefone, 1 carteira verificada por conta, limite por dispositivo, recompensa só após X dias ou reputação mínima |
| A4 | **Banimento não derruba a sessão**, e usuário banido ainda consegue chamar ações (ex.: enviar mensagem no chat) | Apagar as sessões ao banir e checar `isBanned` dentro de `getCurrentUser()` |
| A5 | Sem *rate limit* no login (força bruta) | Limitar tentativas por IP e por e‑mail (Upstash/Redis ou tabela no Postgres) |
| A6 | Moderação 100% manual não escala. O pitch fala em "validação pela comunidade" e "pontuação de reputação", mas só existem moderadores e pontos | Pré‑triagem com IA de visão (a foto bate com a missão? é print? é duplicada?) + **validação comunitária com reputação** (usuários confiáveis votam; moderador decide só os casos duvidosos) |

### 🟡 Médio (qualidade, desempenho, manutenção)

- **Chat**: cada mensagem gera uma notificação por cidadão, num loop com 1 `INSERT` por vez (com 1.000 usuários, são 1.000 inserts por mensagem). A API retorna as **50 mensagens mais antigas** (ordem crescente com `limit`), não as mais recentes. Mensagens apagadas "para todos" continuam com o texto no JSON enviado ao navegador. Moderadores e admins não podem escrever no chat. Atualização por *polling* a cada 5 s → trocar por Supabase Realtime ou SSE.
- **Consultas**: o ranking carrega *todos* os usuários, e o contador de não lidas busca todas as linhas em vez de `count(*)`. Paginar e usar agregações.
- **Missões**: cada missão só pode ser feita **uma vez na vida**, inclusive se a comprovação foi rejeitada. Para reciclagem e coleta, faz sentido ter missões recorrentes com *cooldown*.
- **Config**: `drizzle.config.json` tem o host e o ref do projeto Supabase fixos no código (deveria vir de `DATABASE_URL`); `ssl: { rejectUnauthorized: false }`; `allowedOrigins` só tem `localhost` e Codespaces, sem o domínio de produção.
- **Lint**: 8 erros (setState dentro de effect).
- **Sem testes**, sem migrations versionadas no repositório, sem seed e sem `.env.example`.
- **README vazio** e `package.json` com nome `nextjs-postgresql-template`.
- **CI**: só gera APK *debug* e o publica como Release a cada push. Não roda lint, typecheck nem testes. Para a Play Store é preciso um **AAB assinado**.
- **Play Store**: um app que só abre um site num WebView corre risco de ser rejeitado pela política de "funcionalidade mínima". Câmera, GPS e notificações push nativas ajudam a passar.

### ⚖️ Legal e conformidade (Brasil)

- **LGPD**: o app coleta **localização precisa e fotos** (às vezes de pessoas). Precisa de política de privacidade, consentimento explícito, remoção de EXIF antes de exibir fotos e exclusão de conta (o Google Play também exige exclusão de conta).
- **Menores de idade**: se o público inclui estudantes do Mediotec, é preciso consentimento dos responsáveis, especialmente com cripto envolvida.
- **Cripto**: distribuir tokens como recompensa no Brasil entra no tema de ativos virtuais (Lei 14.478/2022 e regulamentação do Banco Central). Vale uma consulta jurídica antes de escalar, e o contrato com a Fone deve deixar claro quem é o emissor e quem custodia o FONE.

---

## 4. Roadmap sugerido

### Fase 0: "Voltar a funcionar" (1–2 semanas)
- [x] Corrigir o build (C1) e os 8 erros de lint
- [x] Atualizar o Next.js e dependências (C7)
- [x] Transação + idempotência na aprovação (C4)
- [x] Upload autenticado e no Supabase Storage (C5, C6)
- [x] Permissões Android para câmera, GPS e microfone (C8)
- [x] CI com `lint` + `typecheck` + `build` em todo PR
- [x] README de verdade, `.env.example`, seed com missões de Recife, checagem pré‑migração
- [ ] **Deploy público estável** e atualização do link `douglas-sketch.github.io/eco-verify` para apontar ao app real (depende de você: Supabase Storage + hospedagem)

### Fase 1: "Integração FONE de verdade" (até dez/2026, janela do vesting)
- [ ] Camada `src/lib/fone/` (adapter) com: criar/importar carteira, saldo, enviar FONE, histórico. Isolada para trocar fácil quando sair o SDK do Node 2.0
- [x] Prova de posse da carteira e carteira única por conta (C2)
- [ ] Worker de pagamento automático com carteira‑tesouro e teto diário (C3)
- [ ] **Hash da prova (foto + missão + data) nos metadados da transação FONE**, o que entrega a "rastreabilidade transparente" prometida no pitch
- [ ] Tela "Meu saldo / Extrato" e link da transação no explorer
- [ ] **Atualizações semanais públicas** (changelog, vídeo curto, post no Telegram da Fone), no mesmo formato que a Fone pediu no hackathon

### Fase 2: "Antifraude e escala" (Q1 2027)
- [ ] Pré‑triagem com IA + validação comunitária com reputação (A6)
- [ ] pHash, EXIF, foto só pelo app, detecção de mock location e Play Integrity (A1, A2)
- [ ] Verificação de e‑mail/telefone e regras anti‑sybil (A3)
- [ ] Rate limit, revogação de sessão no ban (A4, A5)
- [ ] Testes automatizados (moderação e pagamento primeiro)
- [ ] Chat em tempo real (Supabase Realtime) e notificações push

### Fase 3: "Produto vendável" (Q1–Q2 2027)
- [ ] **Painel de patrocinador**: empresas, prefeituras e ONGs criam e financiam missões em FONE
- [ ] **Página pública de impacto** (kg reciclados, árvores, mutirões, mapa), boa para mídia e investidor
- [ ] Integração com o **Green Karma** (ações verificadas viram cards/certificados) e com o **Fone Shop** (gastar FONE)
- [ ] NFT/certificado de impacto por conquista (a Fone já suporta NFTs)
- [ ] Publicação na Play Store (AAB assinado) e depois iOS

---

## 5. Como vender para a Fone (Ivan Likov)

O que convence um CEO de cripto é **tração mensurável + utilidade para o token**. Sugestão de roteiro:

1. **Fazer um piloto real antes do pitch.** Exemplo: 60–90 dias com uma turma ou unidade do Senac Recife + 3 a 5 ecopontos ou pontos de coleta da cidade. Meta: X usuários ativos, Y ações verificadas, Z kg reciclados, N transações FONE on‑chain.
2. **Mostrar números, não telas.** Usuários ativos, taxa de aprovação, fraude bloqueada, FONE distribuído, custo por ação verificada.
3. **Modelo de negócio claro**, por exemplo:
   - **Patrocinadores** (empresas com meta ESG, prefeituras, cooperativas) pagam para criar missões. O EcoVerify cobra uma taxa sobre o orçamento da missão.
   - Parte da taxa pode ser **queimada** (a Fone tem *burn*), o que é bom para o token.
   - **Relatórios de impacto ESG** verificáveis on‑chain como produto pago.
4. **Encaixe no roadmap deles**: "camada de prova de impacto real para o Green Karma Node 2.0", "caso de uso brasileiro do SDK Global", "utilidade para o Fone Shop e Mobile Payments".
5. **Proposta concreta** (escolha uma): (a) parceria oficial e app listado no ecossistema; (b) aquisição ou licenciamento; (c) grant ou investimento para o piloto com contrapartida de métricas. Leve um *one‑pager* + vídeo de 2 min + link do app funcionando.

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| SDK da Fone muda com o Node 2.0 / atraso no SDK público | Adapter isolado; manter a fila atual como fallback |
| Fraude drenando a carteira‑tesouro | Teto diário, recompensa com atraso (ex.: 7 dias), reputação mínima, antifraude da Fase 2 |
| Volatilidade do FONE (recompensa perde valor) | Definir recompensas em "pontos" convertidos por cotação, com teto em reais/dólar |
| Dependência de um único ecossistema | Arquitetura de recompensa plugável (FONE hoje, outros tokens e vouchers locais depois) |
| Regulatório (cripto + LGPD + menores) | Consulta jurídica, termos de uso, consentimento, exclusão de dados |
