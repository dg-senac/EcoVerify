# Missões por região

Objetivo: quem abre o app em qualquer cidade do Brasil vê primeiro **o que dá para fazer perto de onde está**, e nenhuma cidade fica com a tela vazia.

## Como a pessoa usa

1. Na tela **Missões**, escolhe a região:
   - **Usar minha localização**: o GPS é lido uma vez, só para descobrir a cidade;
   - **Escolher cidade**: busca por nome (sem acento também funciona).
2. Vê três blocos:
   - **Perto de você · Cidade, UF**: missões dentro do raio (10, 30 ou 100 km; padrão 30), da mais perto para a mais longe, com a distância no cartão;
   - **Em qualquer lugar**: missões feitas em casa (ex.: separar recicláveis, guardar óleo usado). Na comprovação o GPS continua sendo registrado, mas **não há conferência de distância**;
   - "**N missões em outras regiões**": para saber que o app existe além dali.
3. **Trocar** muda a região; **Ver todas** apaga a região e volta à lista completa.
4. Se houver menos de 3 missões perto:
   - **Quero mais missões aqui**: registra um pedido (uma vez por pessoa e cidade) e mostra quantas pessoas pediram;
   - **Sugerir uma ação**: nome, descrição, tipo e o ponto atual do GPS. Vai para a moderação.

## Privacidade

- A região fica **só num cookie do aparelho** (`ev_region`, httpOnly, 180 dias): cidade, UF, código IBGE, raio e coordenadas **arredondadas a 2 casas (~1 km)**. Não vai para o banco.
- O nome da cidade vem de `src/data/municipios-br.json` (5.570 municípios, IBGE, licença MIT, ver `src/data/README.md`). **Nenhuma posição é enviada a serviços de geocodificação.**
- O banco guarda apenas: pedidos "quero mais missões" (pessoa + cidade) e sugestões (texto + ponto escolhido). Ambos entram na exportação de dados; na exclusão de conta os pedidos e as sugestões não aprovadas são apagados (as aprovadas já viraram missões públicas).
- A Política de Privacidade foi atualizada (cookie de região, OpenStreetMap, pedidos e sugestões).

## Abastecimento automático (OpenStreetMap)

Quando alguém abre uma região com menos de 3 missões locais, o servidor (depois de responder a página, via `after()`) consulta a **Overpass API do OpenStreetMap** num raio de 15 km do **centro do município** (nunca a posição da pessoa) e procura:

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
- Controle de repetição (`region_seeds`): uma busca por cidade; se deu certo, só tenta de novo depois de 30 dias; se falhou, depois de 24 h; uma busca "travada" é liberada após 10 min. O admin vê o histórico em "Buscas automáticas no OpenStreetMap".
- Variáveis: `AUTO_MISSIONS_OSM=off` desliga; `OVERPASS_API_URL` aponta para outra instância (a pública tem uso justo; para escala, use uma instância própria ou um espelho).

## Sugestões da comunidade

- Até 3 sugestões pendentes por pessoa (título 5–120, descrição 30–1000 caracteres).
- Aparecem na **Moderação** com link para o mapa. **Virar missão** cria uma missão local com origem "sugestão", só pontos (limpeza 50, plantio 60, doação 40, reciclagem 25, outros 30) e "para revisar". **Recusar** só fecha. A pessoa é notificada nos dois casos.

## Admin

- **Nova missão**: "Em um local" (precisa de latitude/longitude; a cidade é preenchida sozinha) ou "Em qualquer lugar" (coordenadas opcionais); campo **Apoio local** (nome do patrocinador, aparece no cartão).
- **Cidades pedindo missões**: ranking de pedidos com o número de missões ativas em cada cidade (em vermelho quando é zero). É o mapa de onde buscar parceiros.

## Na demo offline

- Mesma tela de região (GPS, busca de cidade e o atalho "Usar Recife").
- A lista de municípios só é baixada quando a pessoa escolhe uma região.
- Em cidade sem missões, a demo cria **3 lugares de exemplo** perto do centro (no lugar da busca no OpenStreetMap), só pontos e "para revisar"; a Ana Admin revisa em Admin → Missões.

## Arquivos

- `src/lib/region.ts`: regras puras (distância, cidade mais próxima, busca, agrupamento), usadas pelo app e pela demo.
- `src/lib/municipalities.ts`, `src/lib/regional/{cookie,templates,osm}.ts`, `src/lib/actions/region.ts`.
- `src/components/missions/{region-bar,want-more-button,suggest-mission-form}.tsx`, `src/components/moderation/suggestion-card.tsx`, `src/components/admin/mission-review.tsx`.
- Demo: `demo/src/components/RegionBar.tsx`, `demo/src/municipalities.ts`, `demo/src/screens/Missions.tsx`.
