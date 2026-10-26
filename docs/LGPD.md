# Conta, privacidade e LGPD

Resumo técnico do que o EcoVerify faz para cumprir a LGPD (Lei 13.709/2018) e proteger as contas. Os textos públicos estão em `/termos` e `/privacidade`.

> ⚖️ **Revisar com advogado antes de abrir ao público.** Os Termos e a Política foram escritos a partir dos fluxos reais de dados do app, mas são um texto-base, não um parecer jurídico. Pontos que merecem atenção especial: controlador (pessoa física ou jurídica), encarregado (DPO), menores de 13–17 anos, transferência internacional (Vercel/Supabase/Resend) e o tratamento tributário das recompensas em FONE.

## Configuração

| Variável | Para quê |
|---|---|
| `LEGAL_CONTROLLER_NAME` | Nome de quem responde pelos dados (aparece nos documentos). Padrão: "EcoVerify". |
| `LEGAL_CONTACT_EMAIL` | E-mail de privacidade / encarregado. Sem ele, os documentos dizem "pelos canais do app". |
| `RESEND_API_KEY` + `EMAIL_FROM` | Envio de e-mails pelo [Resend](https://resend.com) (plano gratuito basta para começar). `EMAIL_FROM` precisa ser de um domínio verificado, ex.: `EcoVerify <nao-responda@ecoverify.app>`. |
| `APP_URL` | URL pública do app (ex.: `https://ecoverify.app`), usada nos links dos e-mails. Nunca usamos o cabeçalho Host da requisição, que pode ser forjado para roubar links de redefinição. |

**Modos de e-mail** (`src/lib/email.ts`):

- `resend`: as três variáveis de e-mail configuradas → e-mails enviados e confirmação de e-mail **exigida** para vincular carteira.
- `console`: desenvolvimento sem chave → o e-mail (com o link) aparece no log do servidor.
- `off`: produção sem chave → nada é enviado, a confirmação não é exigida e o painel admin mostra um aviso. "Esqueci minha senha" fica indisponível.

## Fluxos

**Cadastro**: nome, e-mail, senha e duas caixas obrigatórias: (1) aceite dos Termos e da Política, com links; (2) declaração de idade mínima (13 anos) e, se menor de 18, autorização do responsável. Gravamos `terms_accepted_at` e `terms_version`. Um e-mail de confirmação é enviado (link válido por 48 h).

**Idades**: 13+ para usar; FONE só para 18+ (declaração separada, já exigida ao vincular carteira desde a 1.2). Constantes em `src/lib/legal.ts` (`MIN_AGE`, `FONE_MIN_AGE`).

**Nova versão dos termos**: ao mudar algo relevante, altere `TERMS_VERSION` em `src/lib/legal.ts`. Na próxima visita, todo usuário é levado a `/accept-terms` antes de usar o app. Contas criadas antes desta versão passam por essa tela uma vez.

**Confirmação de e-mail**: banner no topo do app até confirmar, com "Reenviar link" (3 por hora). Vincular carteira exige e-mail confirmado (quando o envio está ativo): reduz contas descartáveis e garante um canal para recuperar a conta.

**Esqueci minha senha**: `/forgot-password` sempre responde a mesma mensagem (não revela se o e-mail existe). Link válido por 1 hora, uso único; ao redefinir, todas as sessões são encerradas e o e-mail conta como confirmado. Limites: 10 pedidos/h por IP e 3/h por e-mail.

**Trocar senha** (Configurações → Conta): exige a senha atual e encerra as sessões dos outros aparelhos.

**Tokens**: 32 bytes aleatórios (base64url) enviados só por e-mail; no banco fica apenas o SHA-256 (`auth_tokens`). Um token novo invalida os anteriores do mesmo tipo; o consumo é atômico.

## Direitos do titular (art. 18)

**Acesso e portabilidade**: Configurações → Privacidade e dados → "Baixar (JSON)" (`GET /api/account/export`): perfil, preferências, carteira, aceite dos termos, comprovações, pontos, recompensas FONE, notificações, mensagens do chat, favoritos e denúncias feitas. A senha nunca sai.

**Eliminação**: Configurações → Privacidade e dados → "Excluir conta" (senha + confirmação). A conta é **anonimizada** em vez de apagada, para não quebrar o histórico de pagamentos e o antifraude (art. 16):

| Apagado | Mantido sem identificação |
|---|---|
| Nome, e-mail, senha | Comprovações já analisadas (sem foto, relato nem GPS) |
| Fotos e mídias (arquivos removidos do storage) | Hash das fotos (impede reaproveitar a mesma foto em outra conta) |
| Relatos e localização | Histórico de pontos |
| Mensagens do chat (e citações delas nas respostas de outras pessoas) | Pagamentos FONE já feitos (valor, carteira, hash: são públicos na blockchain) |
| Carteira, pedido de verificação, declaração de 18+ | Carteira usada na verificação (`wallet_verification_tx`), para que a mesma transferência não prove posse de outra conta |
| Comprovações pendentes e FONE ainda não pago | |
| Notificações, favoritos, denúncias feitas, sessões, tokens | |

O último administrador não consegue excluir a própria conta (precisa promover outra pessoa antes). Contas excluídas somem do ranking, da lista de usuários do admin e não podem ser reativadas.

**Correção**: nome e preferências pelo app; outros pedidos pelo contato de privacidade.

## Operadores (subprocessadores)

Supabase (banco e arquivos), Vercel (hospedagem) e Resend (e-mails). Ao trocar algum, atualize a seção 2 da Política em `src/components/legal/privacy-content.tsx`.

## Pendências conhecidas

- Rate limits ficam em memória (por instância). Em produção com várias instâncias, mover para Redis/Upstash.
- A idade é **autodeclarada**. Verificação documental fica para quando houver volume de pagamentos que justifique.
- Não há registro (log) de auditoria de acesso a dados pessoais por moderadores/admins.
