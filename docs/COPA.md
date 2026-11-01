# Temporadas e Copa das Escolas

O ranking tem três abas:

| Aba | O que mostra |
| --- | --- |
| 🔥 **Temporada** (abre primeiro) | Pontos ganhos na temporada atual. Recomeça a cada dois meses, então quem chegou agora também pode chegar ao topo. |
| ⭐ **Geral** | Todos os pontos desde o cadastro (o ranking antigo). |
| 🏫 **Escolas** | A **Copa das Escolas** da temporada atual, as campeãs da anterior e as regras. |

Moderador e admin não jogam: só cidadãos sem bloqueio aparecem nos rankings.

## Temporadas

- Cada temporada dura **dois meses do calendário**: jan–fev, mar–abr, mai–jun, jul–ago, set–out e nov–dez. São bimestres, o mesmo ritmo das escolas. O horário usado é o do Recife (UTC−3, sem horário de verão).
- **Nada é guardado** sobre as temporadas. A temporada de cada momento é calculada, e os pontos vêm do livro de pontos (`points_ledger`). Se a auditoria retira os pontos de uma comprovação, a linha some do livro e também sai da temporada.
- Na temporada contam todos os pontos: missões (inclusive as de organizações), quiz diário e avisos de lixo.
- A tela mostra quantos dias faltam, uma barra de progresso, a sua posição e os 3 destaques da temporada anterior.

## Copa das Escolas

A Copa reúne as organizações do tipo **escola** com qualquer plano, inclusive o gratuito, porque isso traz escolas novas. As regras abaixo deixam a disputa justa:

1. **Só os 20 participantes que mais pontuaram contam** (`CUP_TOP_N`). Assim, uma escola grande não ganha só pelo tamanho.
2. **A escola só entra na tabela com pelo menos 3 participantes pontuando** (`CUP_MIN_ACTIVE`). Antes disso ela aparece em cinza, com "falta N participante(s)".
3. **Missões criadas por organizações não contam.** Assim, uma escola não pode criar missões fáceis para si mesma. Essas missões continuam valendo no ranking interno da escola. Contam as missões públicas, o quiz e os avisos de lixo.
4. **Os pontos contam a partir da entrada na escola.** Ninguém pode trocar de escola no fim da temporada levando os pontos.
5. **Cada pessoa conta para uma escola só:** a primeira em que entrou.

Onde a Copa aparece:

- **Ranking → Escolas:** a tabela, a sua escola em destaque, as campeãs da temporada anterior (com o selo "Campeã") e "Como funciona".
- **Painel da organização (visão geral), só para escolas:** um cartão com a posição e os pontos da temporada, que leva para a Copa.
- **Página pública `/o/<slug>`:** um selo "🏆 Copa das Escolas · Temporada N: 1º" quando a escola está na tabela. Mostra só números da escola, nunca nomes, porque há menores de idade.

A premiação é de reconhecimento: posição, selo de campeã e destaque no ranking. Não há prêmio em dinheiro nem em FONE, porque só maiores de 18 anos recebem FONE e pagamentos estão desligados. Nada impede que um patrocinador ou a prefeitura ofereça um prêmio por fora.

## Código

- `src/lib/seasons.ts` (puro, testado): cálculo das temporadas, rankings, regras da Copa e textos em pt/en/es.
- `src/lib/seasons-server.ts`: lê do banco as linhas do livro de pontos da temporada atual e da anterior, as escolas e os participantes. Ela usa linhas brutas para manter as regras no arquivo puro. Com muito volume, as somas podem ir para o SQL (agrupando por pessoa e tipo de ponto).
- `src/components/ranking/season-board.tsx`: tela compartilhada entre web e APK.
- Web: `src/app/(app)/ranking/page.tsx` (aceita `?tab=season|all|schools`), o painel da organização e a página pública.
- APK: `demo/src/screens/Ranking.tsx` (`#/ranking` e `#/ranking/schools`) e o painel em `demo/src/screens/Orgs.tsx`. O livro de pontos local é o `pointsLog`.
- Testes: `tests/seasons.test.ts`.
- Banco: nenhuma tabela nova.

## Próximos passos possíveis

- Avisar todo mundo quando a temporada acabar ("Sua escola ficou em 2º!"), com uma notificação gerada pelo cron.
- Separar a Copa por cidade ou estado quando houver muitas escolas.
- Certificado de "Escola campeã" para imprimir, no plano Escola.
