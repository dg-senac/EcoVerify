# Cartões, suspensão e moderação só para admin

Sistema de "cartões de futebol" contra fraude. O objetivo é educar antes de punir: só tentativa de fraude
recebe cartão, todo cartão tem explicação escrita por uma pessoa e todo cartão pode ser contestado.

## Regras

| Situação | O que acontece |
| --- | --- |
| Erro honesto (foto escura, fora do local por engano, missão errada) | Só rejeição com motivo. **Sem cartão.** |
| 1º e 2º cartão amarelo | Aviso, com a explicação da equipe. |
| 3º amarelo válido | **Suspensão de 14 dias**: não entra no app, FONE pendente fica congelado (guardado). Os 3 amarelos ficam "cumpridos" e a contagem recomeça. |
| Validade do amarelo | 180 dias (6 meses). Depois disso deixa de contar. |
| Nova tentativa até 6 meses depois de uma suspensão | O cartão é registrado e o **admin recebe "🟥 Reincidência"** para decidir se dá vermelho. |
| Cartão vermelho | Bloqueia a conta (igual ao banimento, com motivo). Só admin dá. |

Infrações (motivos do cartão): foto da internet, foto de tela ou impressão, foto reaproveitada, imagem gerada ou
montada, relato inventado, localização falsa, ofensa na comunidade e outra tentativa de fraude.

**A IA nunca dá cartão.** Ela só sinaliza (ex.: "⚠️ Possível foto da internet") e a pessoa da equipe decide.

## Quem pode o quê

| Ação | Moderador (se liberado) | Admin |
| --- | --- | --- |
| Revisar comprovações e dar amarelo ao rejeitar | ✅ | ✅ |
| Dar vermelho, cancelar cartão, responder contestação, encerrar suspensão | — | ✅ |
| Banir/desbanir, pagar FONE | — | ✅ |

**Moderação começa só com administradores.** A variável `MODERATORS_ENABLED=true` libera o papel "Moderador".
Sem ela, quem tem esse papel não vê o menu Moderação, as ações de moderação recusam o pedido e os alertas de
"possível foto da internet" vão só para os admins. Na demo, a mesma chave é a opção **"Moderadores podem revisar
comprovações"** em Admin → Usuários (começa ligada para dar para testar o Carlos).

## Onde cada coisa aparece

- **Moderação → Rejeitar:** caixa "Dar cartão amarelo" (só para motivos de fraude). A explicação do cartão é o
  texto que o moderador escreveu.
- **Perfil → Meus cartões:** tipo, motivo, explicação, validade e o botão *Contestar* (uma vez, 20+ caracteres).
- **Tela de conta suspensa/bloqueada:** motivo, data de volta (suspensão) e contestação (uma por suspensão/bloqueio).
  Quem estava com o app aberto no momento da suspensão também cai nessa tela (a sessão é encerrada), em vez de
  voltar ao login sem explicação.
- **Admin → Usuários:** selos 🟨 n/3, 🟥 e SUSPENSO; painel "Contestações de cartões"; **Ficha** de cada pessoa
  (estatísticas, FONE pago/a pagar, cartões, dar cartão, cancelar/manter, encerrar suspensão). O nome da aba mostra
  quantas contestações esperam resposta.
- **Admin → Recompensas:** pagar alguém suspenso ou bloqueado é recusado ("FONE congelado").
- **Termos de Uso, item 8:** as mesmas regras, para o usuário.

## Código

| Arquivo | Papel |
| --- | --- |
| `src/lib/cards.ts` | Regras puras (validade, contagem, suspensão, textos). Usado pelo servidor e pela demo. |
| `src/lib/cards-server.ts` | Dar, cancelar e manter cartão; encerrar suspensão (banco). |
| `src/lib/actions/cards.ts` | Server actions com as permissões. |
| `src/lib/staff-config.ts` / `src/lib/nav.ts` (`canReview`) | Chave `MODERATORS_ENABLED` e quem pode revisar. |
| `src/components/cards/cards-panel.tsx` | "Meus cartões" (servidor e demo). |
| `src/components/admin/user-sheet-view.tsx` | Ficha do usuário (servidor e demo). |
| `demo/src/store.ts` | Espelho offline das mesmas regras. |

## Banco de dados

Ao ligar o banco: `npm run db:push` cria o enum `card_type`, a tabela `user_cards` e as colunas
`users.suspended_until` e `users.suspension_reason`.
