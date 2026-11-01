# 🌱 EcoVerify

**Ações sustentáveis reais, verificadas e recompensadas em FONE.**

O EcoVerify conecta ações sustentáveis do mundo real (reciclagem, plantio de árvores, doação de roupas, mutirões de limpeza) a recompensas na criptomoeda **FONE**, da [Fone Protocol](https://fone.dev).

> 🥉 **3º lugar no Fone Protocol SDK Hackathon (2025)**. Projeto de Douglas Gabriel, aluno do Mediotec do Senac Recife.
> [Matéria do Senac‑PE](https://www.pe.senac.br/aluno-do-mediotec-do-senac-recife-e-finalista-em-hackathon-internacional/)

> 🧪 **Testar agora, sem instalar nada:** [demo offline](https://eco-verify-ruddy.vercel.app/) · APK em [Releases](https://github.com/dg-senac/EcoVerify/releases) · roteiro de testes em [`docs/TESTES.md`](docs/TESTES.md).

---

## Como funciona

1. **Cadastro + carteira FONE**: o usuário cria a conta (aceitando os [Termos e a Política de Privacidade](#conta-privacidade-e-lgpd) e confirmando o e-mail) e vincula a carteira do app oficial **Fone Wallet**, provando que é dono dela (veja [Carteira e pagamentos FONE](#carteira-e-pagamentos-fone)). Só maiores de 18 anos recebem FONE; menores participam com pontos e ranking.
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

O seed cria `admin@ecoverify.dev`, `moderador@ecoverify.dev` e `cidada@ecoverify.dev` (senha definida em `SEED_PASSWORD`, padrão `ecoverify123`). Não rode o seed em produção. Mesmo que essas contas existam no banco, elas **não conseguem entrar em produção** (a não ser com `ALLOW_SEED_ACCOUNTS=true`).

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
- `FONE_TREASURY_ADDRESS`: endereço FONE nativo da carteira do EcoVerify que recebe as transferências de verificação. Sem ela, a verificação de carteiras fica fechada. `FONE_EXPLORER_URL` (padrão `https://fone.dev`) define os links do explorer.
- `RESEND_API_KEY` + `EMAIL_FROM` + `APP_URL`: e-mails de confirmação de conta e de "Esqueci minha senha". Sem eles, em produção, nada é enviado e a confirmação de e-mail não é exigida (o admin vê um aviso). Em desenvolvimento, os e-mails aparecem no log do servidor.
- `LEGAL_CONTROLLER_NAME` + `LEGAL_CONTACT_EMAIL`: quem responde pelos dados e o contato de privacidade, exibidos nos Termos e na Política.
- `FONE_REWARDS_WALLET` (opcional): endereço público da carteira que paga as recompensas, mostrado na página de Transparência para qualquer pessoa conferir saldo e envios.
- `CAPACITOR_SERVER_URL`: URL HTTPS do app web, usada no build Android. **Opcional**: sem ela, o APK é gerado com a demo offline.
- `PIX_KEY` + `PIX_RECEIVER_NAME` + `PIX_RECEIVER_CITY` (opcionais): chave Pix que recebe os planos das organizações. `SALES_WHATSAPP` (ou, sem ele, `SALES_EMAIL`) vira o link "Fale com a gente" da aba Plano. Veja [`docs/SAAS.md`](docs/SAAS.md).
- `ADMIN_EMAILS`: e-mail(s) do dono. A conta com esse e-mail vira admin quando o e-mail é confirmado (ou com `npm run admin:promote -- email`), não pode ser rebaixada, banida nem receber cartão pelo painel e, enquanto a variável existir, só esses e-mails podem ser admin. **Nunca coloque senhas em variáveis.** Veja [`docs/SEGURANCA_ADMIN.md`](docs/SEGURANCA_ADMIN.md).
- `MODERATORS_ENABLED` (padrão desligado): libera o papel Moderador. `ALLOW_SEED_ACCOUNTS` (padrão desligado): as contas de exemplo do seed nunca entram em produção sem ela.
- `GOOGLE_VISION_API_KEY` + `VISION_MONTHLY_LIMIT` (opcionais): busca reversa automática de fotos da internet. Veja [`docs/VERIFICACAO_IA.md`](docs/VERIFICACAO_IA.md).
- `DEMO_SITE_URL` (opcional, só no build da demo): domínio público da demo, usado na prévia de link (WhatsApp, redes). Na Vercel, o domínio de produção é detectado sozinho.

## Atualizando um banco já existente

Esta versão adiciona **índices únicos** que impedem pagamento em dobro, carteira repetida e foto duplicada. Antes do `db:push` em produção:

1. Rode [`scripts/pre-migration-check.sql`](scripts/pre-migration-check.sql) no SQL Editor do Supabase. Todas as consultas devem voltar vazias.
2. Corrija o que aparecer (há exemplos no próprio arquivo).
3. Rode `npm run db:push`.

### Atualizando para a 1.2 (carteira verificada)

Depois do `npm run db:push`, rode [`scripts/wallet-verification-cleanup.sql`](scripts/wallet-verification-cleanup.sql). Ele lista e remove os endereços antigos não verificados (os `0xFONE…` falsos gerados pelo app, endereços BEP-20 e textos inválidos). O app já ignora esses endereços mesmo sem o script, e o FONE na fila continua guardado até a pessoa verificar uma carteira.

### Atualizando para a 1.3 (conta, LGPD e marca Fone)

O `npm run db:push` cria a tabela `auth_tokens` (enum `auth_token_purpose`) e as colunas `email_verified_at`, `terms_accepted_at`, `terms_version` e `deleted_at` em `users`. Não há dados a corrigir. Depois do deploy:

- Usuários existentes verão a tela **"Atualizamos nossos termos"** uma vez.
- Configure `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL`. Quando o envio estiver ativo, usuários antigos verão o banner para confirmar o e-mail e precisarão confirmá-lo para vincular uma carteira nova (carteiras já verificadas continuam recebendo).

### Atualizando para a 1.4 (modo noturno, IA e missões por região)

O `npm run db:push` cria as colunas de tema, verificação por IA, região e regras de pagamento, e as tabelas `ai_settings`, `region_seeds`, `mission_requests`, `mission_suggestions`, `fone_settings` e `sponsors`. Recompensas já aprovadas continuam valendo; passam a seguir o mínimo de 5 FONE e a carência de 7 dias (ajustáveis em Admin → Recompensas). Missões antigas continuam valendo como "em um local"; para aparecerem com o nome da cidade, rode `npm run db:seed` (preenche as de exemplo) ou edite-as. Usuários verão os Termos atualizados uma vez (IA e região).

### Atualizando para a 1.9 (anti-cópia, cartões e admin seguro)

O `npm run db:push` cria as colunas de bloqueio, contestação e suspensão em `users`, o enum `card_type`, a tabela `user_cards` e o valor `ban_appeal` em `auth_token_purpose`. Depois:

1. Defina `ADMIN_EMAILS` com o seu e-mail na Vercel e faça o deploy.
2. Crie a sua conta no app (com a sua senha) e confirme o e-mail. Ela vira admin sozinha. Sem e-mail configurado, rode `npm run admin:promote -- seu@email`.
3. Confira em Admin → Usuários o quadro **🔐 Segurança da administração** (tudo ✅).

### Atualizando para a 1.5 (organizações e planos)

O `npm run db:push` cria a coluna `missions.organization_id` e as tabelas `organizations`, `organization_members`, `invoices`, `sponsor_topups` e `points_ledger`. Nada muda para quem já usa: missões existentes continuam públicas. Configure `PIX_KEY` para começar a vender planos.

## Organizações, planos e receita (SaaS)

- **Cidadão usa de graça, sempre.** Quem paga são as organizações: escolas, empresas, prefeituras e ONGs.
- Cada organização tem **missões próprias** (só pontos, só para participantes), **ranking interno**, **moderação pela equipe**, **página pública de impacto** (`/o/<slug>`), **relatório de impacto** para imprimir/PDF e **certificados com QR code** para cada participante.
- Planos: **Comunidade** (grátis, 30 pessoas, 3 missões), **Escola** (R$ 79/mês), **Empresa** (R$ 349/mês) e **Prefeitura** (sob consulta). Planos pagos começam com **14 dias grátis**.
- Pagamento por **Pix** (QR code e copia e cola gerados pelo app, sem intermediário e sem taxa); o admin confere o extrato e confirma em **Admin → 💼 Negócios**, que mostra receita recorrente (MRR), recebidos, testes e cobranças.
- **Campanhas patrocinadas**: a empresa banca o FONE das missões e paga uma taxa de serviço em reais (sugestão: 20%), registrada no cadastro do patrocinador.
- **Este repositório é só o app.** O site de divulgação (landing page com planos e formulário de contato) fica em um repositório separado; quem abre o app deslogado vai direto para o login. O código do site antigo está no commit `27379c6` do `main`, caso queira copiá-lo.

Guia completo (como cobrar, notas fiscais, o que dizer ao cliente): [`docs/SAAS.md`](docs/SAAS.md).

### Receitas sem plano

Quem não quer assinar também pode pagar. Preços sugeridos, roteiros de venda e cuidados legais estão em [`docs/MONETIZACAO.md`](docs/MONETIZACAO.md):

- **Eventos e mutirões avulsos**: missão com data e horário, Pix do evento, relatório e certificados.
- **Comércio local**: vitrine de benefícios (desconto, brinde) para quem tem ações verificadas, com código único conferido no balcão.
- **Reciclagem e logística reversa**: material e peso em cada entrega, relatório de kg e lista de coletas em CSV para campanhas e cooperativas.
- **Dados agregados e anônimos**: totais por cidade, mês e área de ~1 km, sem ninguém identificável, para prefeituras e pesquisas.
- **Editais e prêmios**: kit com textos prontos em [`docs/EDITAIS.md`](docs/EDITAIS.md).

## Carteira e pagamentos FONE

O EcoVerify **não guarda chaves nem cria carteiras**: o usuário usa o app oficial **Fone Wallet** ([Android](https://play.google.com/store/apps/details?id=com.cloud.earning) · [iPhone](https://apps.apple.com/us/app/fone-network/id1665915235)) e só informa o endereço.

**Vincular (prova de posse)**

1. O usuário declara ter 18 anos ou mais e cola o endereço FONE nativo (64 caracteres começando com `f`, o formato do [explorer](https://fone.dev/explorer)). Endereços `0x…` (BEP-20) não são aceitos.
2. O app sorteia um **valor exato e único**, por exemplo `1.37 FONE`, válido por 7 dias.
3. O usuário envia esse valor **da carteira dele** para o endereço de verificação (`FONE_TREASURY_ADDRESS`) e, se quiser, cola o hash da transação. Só o dono consegue enviar FONE de um endereço, então isso prova a posse sem depender de assinatura de mensagem.
4. Em **Admin → Carteiras**, o admin abre o endereço no explorer, confere a transferência (origem, destino, valor e data) e confirma com o hash. A partir daí, a carteira passa a receber os pagamentos.

Um pedido pendente **não ocupa** o endereço, para ninguém "reservar" a carteira de outra pessoa: vale quem provar a posse primeiro. Ao trocar de carteira, a antiga continua recebendo até a nova ser verificada. Cada hash só pode ser usado uma vez.

**Pagar**

Em **Admin → Recompensas**, as recompensas aprovadas aparecem **agrupadas por pessoa**, com o total e a carteira verificada. O admin envia o total da carteira de recompensas pela Fone Wallet e cola o hash: todas as recompensas listadas ficam pagas, com destino, data e responsável registrados. O usuário recebe uma notificação e vê o histórico, com links para o explorer, no perfil. Quem ainda não verificou a carteira fica em "Aguardando carteira verificada".

**Regras de segurança do FONE**: pagamento mínimo (padrão 5 FONE, por causa da taxa de ≈0,15 FONE por envio), **carência** de 7 dias antes de pagar, **orçamento mensal** da tesouraria e **limite por pessoa por mês**. O que passa de um orçamento ou limite fica **em espera** (os pontos valem normalmente) até o admin liberar. O servidor reaplica as regras ao marcar como pago. Detalhes: [`docs/PAGAMENTOS_FONE.md`](docs/PAGAMENTOS_FONE.md).

**Missões patrocinadas**: em Admin → Missões → Patrocinadores, cadastre empresas, prefeituras ou ONGs com o FONE que depositaram. O FONE das missões delas sai desse orçamento, o cartão mostra o saldo e, quando acaba, as recompensas ficam em espera até uma recarga.

**Transparência**: a página pública [`/transparencia`](src/app/(legal)/transparencia/page.tsx) mostra impacto, FONE pago (com links das transações), orçamento do mês, regras, patrocinadores e a carteira de recompensas, **sem nomes**.

**Limitações atuais**: a conferência no explorer é manual, porque a Fone ainda não publicou o SDK nem uma API pública do explorer. Toda a lógica específica da rede fica em [`src/lib/fone.ts`](src/lib/fone.ts), pronta para automatizar a verificação e os envios quando o SDK sair. O formato do endereço foi observado no explorer: confirme com a Fone antes de abrir para o público.

## Verificação automática das fotos (IA)

- Toda comprovação recebe uma análise: **foto repetida** (hash perceptual, pega até foto redimensionada/recomprimida) e, com `GEMINI_API_KEY`, um modelo de visão (Gemini, plano gratuito no piloto) que diz se a foto combina com a missão, se é foto de tela, gerada/editada, imprópria ou escura demais.
- Casos claros são **aprovados ou rejeitados sozinhos**, sempre com um **motivo padronizado** (PT/EN/ES); o resto vai para a moderação com a **sugestão da IA** no card. Rejeições automáticas podem ser **contestadas** (revisão humana, LGPD art. 20).
- **Admin → 🤖 IA**: modo automático / só sugestão / desligada, limites de confiança, valor máximo de FONE que a IA aprova sozinha e métricas.
- Só sai do servidor a foto reduzida e sem EXIF + a missão + o relato (nunca nome, e-mail ou GPS). As fotos passam a ser guardadas **sem EXIF**.

- **Na demo, sem servidor**: em Configurações, quem testa pode colar a **própria chave do Gemini**. Ela fica só no aparelho e faz as fotos reais serem analisadas pela IA de verdade. A demo pública nunca leva chave.

Detalhes, limites do plano gratuito e como trocar de provedor: [`docs/VERIFICACAO_IA.md`](docs/VERIFICACAO_IA.md).

## Cartões e moderação

- Tentativa de fraude pode receber **cartão amarelo** (dado por uma pessoa, nunca pela IA, sempre com explicação). **3 amarelos válidos = 14 dias de suspensão** (FONE pendente congelado); amarelo vale 6 meses; **vermelho** bloqueia e só o admin dá. Todo cartão pode ser contestado.
- **Moderação só para admin por padrão.** `MODERATORS_ENABLED=true` libera o papel Moderador (revisar comprovações e dar amarelo).
- Admin → Usuários tem a **Ficha** de cada pessoa e o painel de contestações. Regras completas: [`docs/CARTOES.md`](docs/CARTOES.md).
- **Chat moderado**: denúncia com motivo (3 denúncias ocultam na hora), IA nas imagens, bloqueio pessoal, silenciar (admin), sem telefone/e-mail/links e áudio/vídeo só 18+. Regras: [`docs/MODERACAO_CHAT.md`](docs/MODERACAO_CHAT.md).

## Missões por região

- A tela de missões pergunta **onde você está**: pelo GPS (só para descobrir a cidade, com coordenadas arredondadas guardadas num cookie do aparelho) ou digitando a cidade. Mostra **"Perto de você"** (raio de 10, 30 ou 100 km, mais perto primeiro), **"Em qualquer lugar"** (missões feitas de casa, sem conferir distância) e quantas missões existem em outras regiões.
- O nome da cidade vem de uma **lista offline dos 5.570 municípios** (`src/data/municipios-br.json`, IBGE), sem mandar a posição para serviços externos.
- **Cidade sem missões**: o servidor busca praias, parques e pontos de coleta no **OpenStreetMap** e cria missões que dão **só pontos até um admin revisar** (Admin → Missões → Para revisar: aprovar com FONE, manter só pontos ou desativar). As pessoas também podem apertar **"Quero mais missões aqui"** (o admin vê a lista de cidades) e **sugerir uma ação**, que a moderação transforma em missão.
- Missões podem ter um **apoio local** (nome no cartão) ou um **patrocinador com orçamento de FONE** próprio (ver [Carteira e pagamentos FONE](#carteira-e-pagamentos-fone)).

Detalhes: [`docs/MISSOES_REGIONAIS.md`](docs/MISSOES_REGIONAIS.md).

## Conta, privacidade e LGPD

- **Termos de Uso** (`/termos`) e **Política de Privacidade** (`/privacidade`) públicos, escritos a partir dos fluxos reais do app: bases legais, operadores (Supabase, Vercel, Resend, Google Gemini), decisões automatizadas e contestação, blockchain pública e irreversível, regras para menores e direitos do titular.
- Cadastro com aceite obrigatório (data e versão gravadas) e declaração de idade: **13+ para usar, 18+ para receber FONE**. Ao mudar `TERMS_VERSION`, todos aceitam a nova versão no próximo acesso.
- Confirmação de e-mail, "Esqueci minha senha" e troca de senha, com tokens de uso único (só o hash fica no banco).
- Em **Configurações → Privacidade e dados**: baixar todos os dados em JSON e **excluir a conta** (anonimização: apaga dados pessoais, fotos e mensagens; mantém sem identificação o que é necessário contra fraude e os pagamentos já feitos).

Detalhes, tabela do que é apagado e pendências: [`docs/LGPD.md`](docs/LGPD.md). ⚖️ Os textos legais são uma base: revise com um advogado antes de abrir ao público.

## Marca Fone

Valores em FONE aparecem com o ícone oficial da Fone, e o selo "Recompensas na rede Fone Protocol" fica no login, no menu e na carteira, no app e na demo. A arte é a publicada em fone.dev; a autorização de uso está **pendente**. Regras de uso e como trocar pelo kit oficial: [`docs/MARCA_FONE.md`](docs/MARCA_FONE.md). O EcoVerify é um projeto independente construído sobre a rede Fone.

## Segurança e antifraude

- Aprovação **atômica** (transação + update condicional) e índices únicos: uma comprovação nunca gera pontos ou FONE duas vezes, nem com cliques ou moderadores simultâneos.
- Fotos validadas pelo **conteúdo real do arquivo** (magic bytes), hash SHA‑256 contra reuso, limite de 5 envios por dia, raio de 150 m e precisão mínima do GPS.
- Uploads só para usuários logados, armazenados fora de `public/` e servidos com `nosniff` e CSP restritiva.
- Limite de tentativas no login, no cadastro, no chat e no upload. Senha mínima de 8 caracteres.
- Admin protegido: `ADMIN_EMAILS` define o dono (vira admin só com e-mail confirmado), ninguém rebaixa ou bane o dono nem o último admin, e contas de exemplo com senha pública ficam bloqueadas em produção.
- Banimento, redefinição de senha e exclusão de conta derrubam as sessões na hora.
- Vincular carteira exige e-mail confirmado (quando o envio de e-mails está ativo).
- FONE com **carência**, **mínimo por envio**, **orçamento mensal** e **limite por pessoa**, decididos dentro da transação de aprovação (com lock) e reaplicados no pagamento.
- Carteira só recebe depois de **verificada** (prova de posse), uma por conta e só para maiores de 18. Pagamento exige hash válido (64 hex), nunca reaproveitado entre pessoas ou verificações, e registra a carteira de destino.

Detalhes e próximos passos: [`docs/RECOMENDACOES.md`](docs/RECOMENDACOES.md).

## Android

O APK tem dois modos:

- **Demo offline** (padrão, quando `CAPACITOR_SERVER_URL` não está configurada): o app roda inteiro no celular, sem internet, servidor ou banco. Tem perfis prontos (cidadão, moderador e admin), as missões do Recife, ranking e chat com usuários fictícios, e saldo de FONE **simulado**. Ideal para testes e apresentações.
- **Servidor**: com `CAPACITOR_SERVER_URL` (HTTPS), o APK abre o app web real.

Para testar a demo no navegador: `npm run demo:dev` (http://localhost:5173).

**Roteiro de testes sem banco** (o que testar em cada perfil, no navegador e no APK, e como relatar problemas): [`docs/TESTES.md`](docs/TESTES.md).

A demo web também é **instalável** (PWA: "Adicionar à tela inicial"), tem prévia de link para WhatsApp/redes e um **modo apresentação** guiado de 3 minutos (Maria → IA → moderação → pagamento → perfil → transparência). Links úteis para compartilhar:

- `https://<sua-demo>/?tour=1`: abre o tour guiado.
- `https://<sua-demo>/?lang=en&tour=1`: o mesmo, em inglês (também `es`).

Na aba Recompensas da demo há o botão **"Simular fim da carência"** para mostrar um pagamento sem esperar 7 dias.

Veja [`BUILD_ANDROID.md`](BUILD_ANDROID.md). O app declara as permissões de **localização**, **câmera** e **microfone**, necessárias para comprovar missões no local e gravar áudios no chat.

## CI

- **CI** (`.github/workflows/ci.yml`): lint, typecheck, auditoria de dependências, build do app web e da demo offline em todo PR.
- **Build Android APK** (`.github/workflows/build-android.yml`): gera o APK debug a cada push na `main`, no modo demo ou servidor conforme `CAPACITOR_SERVER_URL`. O modo aparece no resumo da execução e no título da Release.

## Roadmap

- [x] Prova de posse da carteira (transferência de valor exato) e pagamento só para carteira verificada
- [x] Termos, Política de Privacidade, confirmação de e-mail, recuperação de senha, exportação e exclusão de conta (LGPD)
- [x] Marca Fone nos valores em FONE e na carteira (autorização pendente)
- [ ] Integração direta com o SDK FONE (verificação e envio automáticos, saldo)
- [ ] Hash da comprovação registrado on‑chain (rastreabilidade pública)
- [ ] Antifraude avançado: hash perceptual, EXIF, foto só pela câmera do app, pré‑triagem com IA
- [ ] Validação comunitária com reputação
- [x] Missões por região (GPS ou cidade), missões "em qualquer lugar", abastecimento automático pelo OpenStreetMap, sugestões da comunidade
- [x] Regras de segurança do FONE: pagamento mínimo, carência, orçamento mensal e limite por pessoa
- [x] Patrocinadores com orçamento próprio e página pública de transparência
- [x] Demo instalável (PWA), prévia de link e modo apresentação
- [ ] Certificado de impacto com QR code
- [ ] Gastar FONE no app (comércios parceiros, doação a ONGs)
- [ ] Reputação de usuários e moderadores
