# Missões por região

Objetivo: quem abre o app em qualquer cidade, do Brasil ou de outro país, vê primeiro **o que dá para fazer perto de onde está**, e nenhuma região fica com a tela vazia.

## Como a pessoa usa

1. Na tela **Missões**, escolhe a região. Na primeira vez sem região, abre um convite **"Ver missões perto de você?"** (uma vez só por aparelho; fica embaixo da animação de abertura):
   - **Usar minha localização**: o GPS é lido uma vez, só para descobrir a região (funciona em qualquer país);
   - **Escolher cidade**: busca por nome entre as cidades do Brasil (sem acento também funciona);
   - **Agora não**: fecha o convite; a caixa "Veja as missões da sua região" continua no topo da tela.
2. Vê três blocos:
   - **Perto de você · Cidade, UF**: missões dentro do raio (10, 30 ou 100 km; padrão 30), da mais perto para a mais longe, com a distância no cartão;
   - **Em qualquer lugar**: missões feitas em casa (ex.: separar recicláveis, guardar óleo usado). Na comprovação o GPS continua sendo registrado, mas **não há conferência de distância**;
   - "**N missões em outras regiões**": para saber que o app existe além dali.
3. **Trocar** muda a região; **Ver todas** apaga a região. Sem região, a lista mostra primeiro **Em qualquer lugar** e deixa as missões locais num bloco recolhido **"Missões locais em outras cidades"** (com os nomes das cidades), para ninguém achar que uma missão do Recife é perto de si.
4. Se houver menos de 3 missões perto:
   - **Quero mais missões aqui**: registra um pedido (uma vez por pessoa e cidade) e mostra quantas pessoas pediram;
   - **Sugerir uma ação**: nome, descrição, tipo e o ponto atual do GPS. Vai para a moderação.

## Privacidade

- A região fica **só num cookie do aparelho** (`ev_region`, httpOnly, 180 dias): cidade, UF, código IBGE, raio e coordenadas **arredondadas a 2 casas (~1 km)**. Não vai para o banco.
- **No Brasil**, o nome da cidade vem de `src/data/municipios-br.json` (5.570 municípios, IBGE, licença MIT, ver `src/data/README.md`), sem enviar a posição a ninguém. O GPS só usa um município se a sede estiver a até 60 km.
- **Fora do Brasil** (ou longe de qualquer sede), a região é a **área em volta da pessoa**: um código de quadrícula de 0,25° (~28 km, número negativo para nunca bater com um código IBGE) e o nome da cidade e do país, buscado uma vez na Overpass API do OpenStreetMap (`is_in`) com o ponto **arredondado a ~1 km**. Se a busca falhar, a região se chama "Sua região". Na coluna de UF fica o código do país (ISO, ex.: `PT`).
- O banco guarda apenas: pedidos "quero mais missões" (pessoa + cidade) e sugestões (texto + ponto escolhido). Ambos entram na exportação de dados; na exclusão de conta os pedidos e as sugestões não aprovadas são apagados (as aprovadas já viraram missões públicas).
- A Política de Privacidade foi atualizada (cookie de região, OpenStreetMap, pedidos e sugestões).

## Abastecimento automático (OpenStreetMap)

Quando alguém abre uma região com menos de 3 missões locais, o servidor (depois de responder a página, via `after()`) consulta a **Overpass API do OpenStreetMap** num raio de 15 km do **centro do município** (nunca a posição da pessoa; fora do Brasil, o ponto arredondado da região) e procura:

| Lugar no OSM | Missão criada | Pontos | Máx. |
|---|---|---|---|
| `natural=beach` | Limpeza na praia | 40 | 2 |
| `leisure=park` | Mutirão de limpeza no parque/praça | 30 | 2 |
| `amenity=recycling` | Entregar recicláveis no ecoponto | 20 | 2 |
| `amenity=recycling` + `recycling:cooking_oil=yes` | Entregar óleo usado | 25 | 1 |

Regras:

- No máximo 6 missões por cidade; lugares a menos de 300 m de uma missão da mesma categoria são ignorados; cada lugar do OSM vira no máximo uma missão (`osm_ref` único).
- As missões nascem com **origem "auto", só pontos (0 FONE) e "para revisar"**. O cartão mostra "Nova na região", "Só pontos até a equipe revisar esta missão" e a atribuição "© colaboradores do OpenStreetMap" (licença ODbL).
- **Admin → Missões → Para revisar**: abrir no mapa, conferir se o lugar existe e é seguro e escolher **Aprovar com FONE** (define o valor), **Manter só pontos** ou **Desativar**.
- Controle de repetição (`region_seeds`): uma busca por cidade (fora do Brasil, por quadrícula); se deu certo, só tenta de novo depois de 30 dias; se falhou, depois de 24 h; uma busca "travada" é liberada após 10 min. O admin vê o histórico em "Buscas automáticas no OpenStreetMap".
- Variáveis: `AUTO_MISSIONS_OSM=off` desliga; `OVERPASS_API_URL` aponta para outra instância (a pública tem uso justo; para escala, use uma instância própria ou um espelho).

## Missões em qualquer lugar

- 10 missões valem em qualquer cidade e país: as 2 do `04_missoes_iniciais.sql` e as 8 do `07_missoes_qualquer_lugar.sql` (lista única em `src/lib/anywhere-missions.ts`, usada também pelo `db:seed` e pela demo; um teste confere que o SQL bate com a lista).
- Todas são comprovadas por foto que a IA confere: itens para contar (saco de recicláveis, óleo usado, caixas longa vida, garrafas PET, roupas, livros), antes e depois (recolher lixo numa caminhada) ou foto da ação (sacola retornável). Valem **só pontos** (10 a 30), para não virar fonte de FONE fácil.

## Sugestões da comunidade

- Até 3 sugestões pendentes por pessoa (título 5–120, descrição 30–1000 caracteres).
- Aparecem na **Moderação** com link para o mapa. **Virar missão** cria uma missão local com origem "sugestão", só pontos (limpeza 50, plantio 60, doação 40, reciclagem 25, outros 30) e "para revisar". **Recusar** só fecha. A pessoa é notificada nos dois casos.

## Admin

- **Nova missão**: "Em um local" (precisa de latitude/longitude; a cidade é preenchida sozinha) ou "Em qualquer lugar" (coordenadas opcionais); campo **Apoio local** (nome do patrocinador, aparece no cartão).
- **Cidades pedindo missões**: ranking de pedidos com o número de missões ativas em cada cidade (em vermelho quando é zero). É o mapa de onde buscar parceiros.

## Na demo offline

- Mesma tela de região (GPS em qualquer país, busca de cidade, o atalho "Usar Recife" e o convite da primeira vez). Fora do Brasil, a demo não tem internet para dar nome ao lugar: a região se chama "Sua região".
- A lista de municípios só é baixada quando a pessoa escolhe uma região.
- Em cidade sem missões, a demo cria **3 lugares de exemplo** perto do centro (no lugar da busca no OpenStreetMap), só pontos e "para revisar"; a Ana Admin revisa em Admin → Missões.

## Arquivos

- `src/lib/region.ts`: regras puras (distância, cidade mais próxima, busca, agrupamento), usadas pelo app e pela demo.
- `src/lib/municipalities.ts`, `src/lib/regional/{cookie,templates,osm}.ts`, `src/lib/actions/region.ts`.
- `src/components/missions/{region-bar,want-more-button,suggest-mission-form}.tsx`, `src/components/moderation/suggestion-card.tsx`, `src/components/admin/mission-review.tsx`.
- Demo: `demo/src/components/RegionBar.tsx`, `demo/src/municipalities.ts`, `demo/src/screens/Missions.tsx`.
