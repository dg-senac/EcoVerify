# Moderação do chat da comunidade

O app aceita pessoas a partir de 13 anos, então o chat público precisa se proteger sozinho, sem
depender de um moderador online. Regras em `src/lib/chat-moderation.ts` (compartilhado web + APK).

## O que acontece automaticamente

| Situação | O que o app faz |
| --- | --- |
| Denúncia | A pessoa escolhe um motivo: ofensa/assédio, conteúdo sexual, violência/ameaça, dados pessoais, spam ou outro, e pode escrever um detalhe opcional. |
| 3 denúncias de pessoas diferentes (2 se o motivo for conteúdo sexual ou violência) | A mensagem some na hora para todos, menos para o autor, que vê "Oculta para os outros: em análise". Moderadores e admins recebem um alerta. |
| Imagem enviada (com `GEMINI_API_KEY` e IA ligada) | Só o autor vê a imagem até a IA conferir. Se for imprópria (nudez, violência, ódio, documento legível…), ela é ocultada e a equipe é alertada. Se a IA falhar, a imagem é liberada e as denúncias continuam valendo. |
| Telefone, e-mail ou link no texto | O envio é bloqueado com explicação, para ninguém puxar um adolescente para conversa privada. |
| Áudio e vídeo | Só para quem declarou ter 18 anos ou mais no Perfil, porque a IA não confere esse tipo de mídia. A regra vale no menu, no envio e na rota `/api/upload`. GIFs já vêm do Giphy com `rating=g`. |

## O que cada pessoa pode fazer

- **Cidadão:**
  - denunciar uma mensagem;
  - **bloquear** uma pessoa: deixa de ver as mensagens dela, e ela não é avisada;
  - desbloquear em "Pessoas bloqueadas".
- **Moderador e admin**, em Moderação → Denúncias do chat:
  - **Manter:** a mensagem volta a aparecer e as denúncias são arquivadas;
  - **Remover:** a mensagem fica oculta de vez e o autor recebe um aviso;
  - **Remover + cartão amarelo:** usa o motivo "Ofensa na comunidade" e conta para a suspensão de 2 semanas (`docs/CARTOES.md`).
- **Só o admin:** **silenciar** o autor por 24 h, 7 ou 30 dias. A pessoa continua lendo, mas não envia, e recebe um aviso com a data.

## Banco de dados

Novas colunas e tabela. Rode `npm run db:push` depois de atualizar:

- `community_chat`: `hidden_at`, `hidden_reason` (`reports` | `ai` | `staff`), `ai_status` (`checking` | `ok` | `flagged`);
- `message_reports`: `reason_code`; `status` passa a usar `pending` → `dismissed` | `upheld`;
- `users`: `chat_muted_until`;
- `chat_blocks` (`blocker_id`, `blocked_id`).

Tudo o que é sensível é filtrado no servidor (`fetchCommunityMessages`). Mensagens ocultas,
pessoas bloqueadas e imagens em verificação nunca chegam ao navegador de quem não deve ver.

A exportação LGPD inclui as denúncias feitas pela pessoa. Excluir a conta apaga os bloqueios dela.
