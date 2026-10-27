# Pagamentos em FONE: regras de segurança, patrocinadores e transparência

O FONE é o diferencial do EcoVerify, então a saída dele precisa ser **previsível, barata e à prova de farm**. Estas regras valem igual no app (servidor) e na demo offline. Elas estão em [`src/lib/payout-rules.ts`](../src/lib/payout-rules.ts) (regras puras, compartilhadas) e [`src/lib/payouts.ts`](../src/lib/payouts.ts) (consultas ao banco).

**Pontos nunca são afetados.** As regras só decidem **quando** e **quanto** FONE sai.

## As quatro regras (Admin → Recompensas → Regras de pagamento)

| Regra | Padrão | Para quê |
| --- | --- | --- |
| **Pagamento mínimo** | 5 FONE | Cada envio na rede Fone custa ≈0,15 FONE. Juntando recompensas, a taxa fica em ~3% em vez de comer 15% de uma recompensa de 1 FONE. A tela mostra a % da taxa de cada envio. |
| **Carência** | 7 dias | Tempo para contestações, denúncias e checagem de fraude antes do FONE sair (depois de enviado, não há volta). |
| **Orçamento mensal da tesouraria** | sem limite | Teto de FONE que o EcoVerify compromete por mês. Missões patrocinadas usam o orçamento do patrocinador. |
| **Limite por pessoa por mês** | sem limite | Dificulta farm com várias contas e protege contra uma única conta drenar o mês. |

Quando uma aprovação passa do orçamento ou do limite, a recompensa é criada **em espera** (`reward_queue.hold_reason` = `budget`, `user_cap` ou `sponsor_budget`). A pessoa recebe os pontos normalmente e uma notificação explicando que o FONE ficou em espera. O admin vê o total em espera por motivo e **libera** quando fizer sentido (mês novo, depósito, recarga do patrocinador). Ao liberar, a pessoa é avisada.

Detalhes de implementação:

- A decisão acontece **dentro da transação de aprovação**, com `pg_advisory_xact_lock`, então dois moderadores (ou a IA e um moderador) aprovando ao mesmo tempo não estouram o orçamento.
- Missões de **0 FONE** (só pontos, como as criadas do OpenStreetMap antes da revisão) não criam pagamento vazio.
- O mês é o mês civil no horário de Brasília.
- O **servidor** reaplica as regras ao marcar como pago: mesmo que alguém altere o formulário, só são pagas as recompensas liberadas (fora da carência, sem espera) e só se somarem o mínimo (`in_hold` / `below_min`).

## O que o admin vê

- **Resumo**: FONE pronto para enviar agora, FONE da tesouraria comprometido no mês (fica amarelo a partir de 80% e vermelho quando esgota) e FONE de patrocinadores no mês.
- **Lembrete de saldo**: antes de enviar, conferir no explorador se a carteira de recompensas tem o total pronto + taxas. (O app não lê o saldo sozinho porque a Fone ainda não tem API pública do explorador. Quando o SDK sair, esse alerta passa a ser automático.)
- **Prontos para pagar** / **Ainda não liberados** (carência, espera ou abaixo do mínimo, com a data de liberação) / **Aguardando carteira verificada**.
- **FONE em espera** por motivo, com o botão **Liberar**.

O usuário vê no perfil: FONE pronto para envio, FONE em carência (com a data) e FONE em espera, além da regra de mínimo e carência.

## Missões patrocinadas (Admin → Missões → Patrocinadores)

Empresas, prefeituras e ONGs podem **bancar missões com FONE próprio**:

1. O patrocinador deposita FONE na carteira de recompensas do EcoVerify.
2. O admin cadastra o patrocinador com o valor depositado (e o site, opcional) e depois registra cada recarga.
3. Ao criar a missão, o admin escolhe **quem paga o FONE**: a tesouraria do EcoVerify ou um patrocinador. O nome aparece no cartão ("Apoio: …") com o **saldo restante**.
4. Cada aprovação desconta do orçamento do patrocinador. Quando ele acaba, o cartão avisa e as novas recompensas ficam em espera (`sponsor_budget`) até uma recarga.

O "apoio local" só com o nome (sem orçamento) continua existindo para parceiros que não colocam FONE.

## Página pública de Transparência (`/transparencia`)

Aberta sem login, em PT/EN/ES (`?lang=en`), com link no rodapé do login, nos documentos legais e em Configurações:

- **Impacto**: ações aprovadas, pessoas, cidades, pontos e ações por tipo.
- **FONE**: total pago, número de pagamentos na blockchain, FONE aguardando envio, FONE em espera, orçamento do mês e as regras de pagamento vigentes.
- **Carteira de recompensas**: se `FONE_REWARDS_WALLET` estiver configurada, o endereço público com link para o explorador, para qualquer pessoa conferir saldo e envios.
- **Patrocinadores**: orçamento, comprometido e restante de cada um.
- **Últimos pagamentos**: data, valor, endereço abreviado e link da transação. **Sem nome, e-mail ou foto.** A Política de Privacidade (seção Blockchain) explica isso.

## Anti-sybil: o que já existe e o que vem depois

Já existe:

- Uma conta por e-mail confirmado, **uma carteira por conta** (índice único) e prova de posse da carteira.
- FONE só para maiores de 18 anos (declaração), limite de 5 envios por dia, foto checada por hash exato e perceptual, GPS com raio e precisão mínimos, IA e moderação.
- Agora também: **limite mensal por pessoa**, **carência** e **orçamento mensal**, que limitam o estrago de uma fraude não detectada.

Próximos passos sugeridos (não implementados):

- Alertar o admin quando várias contas pagam para carteiras que recebem FONE da mesma origem (exige API do explorador).
- Reputação do usuário: contas novas com limite menor e carência maior; contas antigas com histórico limpo, o contrário.
- Exigir telefone verificado para valores maiores.

## Atualizando o banco

O `npm run db:push` cria as tabelas `fone_settings` e `sponsors` e as colunas `reward_queue.hold_reason`, `reward_queue.sponsor_id` e `missions.sponsor_id`. Recompensas antigas continuam valendo: as que já passaram de 7 dias ficam prontas para pagar. Sem configurar nada, valem o mínimo de 5 FONE e a carência de 7 dias, sem orçamento nem limite por pessoa.
