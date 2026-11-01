# Mapa

O mapa mostra **o que fazer perto de você** e **onde a comunidade já agiu**, sem expor ninguém.

## Onde fica

| Quem | Onde | O quê |
|---|---|---|
| Cidadão | Menu → **🗺️ Mapa** (`/mapa`), ou o botão **"Ver no mapa"** na tela de Missões | Três camadas que podem ser ligadas e desligadas: missões, lixo e ações verificadas. Toque num marcador para abrir a missão, a limpeza ou a tela de Lixo. O botão "Onde estou" centraliza o mapa em você e não salva nada. |
| Admin | Admin → 📊 Dados → **Por área (~1 km)** | Mapa de calor das ações verificadas, para relatórios a prefeituras, patrocinadores e universidades. A mesma tabela continua exportável em CSV. |

Moderador e admin não ganham o mapa de cidadão, seguindo a regra de que cada papel só vê o que é dele.

## Camadas

| Camada | Mostra | Não mostra nunca |
|---|---|---|
| 🎯 Missões | Missões públicas ativas com ponto no mapa, dentro da sua região. A cor indica a categoria. | Missões "em qualquer lugar" (feitas em casa) e missões privadas de organizações |
| 🗑️ Lixo | Pontos de descarte irregular em três situações: **aberto** (precisa de confirmação), **confirmado** (com limpeza aberta) e **limpo** (até 30 dias depois da limpeza) | Avisos pendentes, rejeitados ou expirados, e **quem avisou** |
| 🔥 Ações verificadas | Ações aprovadas somadas por **área de ~1 km**, com a cor indo de amarelo a vermelho conforme a quantidade | Áreas com **menos de 5 pessoas diferentes**, missões feitas em casa e o GPS de qualquer pessoa |

Com a região escolhida na tela de Missões, o mapa mostra a cidade e o raio escolhido (10, 30 ou 100 km), com um círculo tracejado. Sem região, mostra tudo e enquadra os marcadores.

## Privacidade

- Uma ação aparece **no ponto da missão**, nunca no GPS de quem fez. Esse ponto é arredondado para uma grade de 0,01° (cerca de 1,1 km) e só entra na soma da área.
- A regra das **5 pessoas** é a mesma dos dados anônimos (`MIN_PEOPLE_PER_ROW` em `src/lib/impact.ts`). Muitas ações das mesmas 4 pessoas continuam escondidas.
- "Onde estou" usa a localização só no aparelho, para centralizar o mapa. Nada é enviado nem salvo.

## Mapa base (blocos)

O padrão são os blocos do **OpenStreetMap** (`tile.openstreetmap.org`). Eles são gratuitos, sem chave e exigem atribuição, que já aparece no canto do mapa. A política de uso justo deles não serve para tráfego alto. Quando o uso crescer, aponte para um provedor de blocos, de preferência um com plano gratuito:

- web: `NEXT_PUBLIC_MAP_TILES_URL=https://.../{z}/{x}/{y}.png`
- APK/demo: `VITE_MAP_TILES_URL=...`, definida no momento do build.

A biblioteca é o **Leaflet** (BSD-2, ~43 kB gzip). Ela é carregada só quando o mapa abre e os marcadores são HTML, então não há imagens extras. Sem internet, o fundo fica cinza, mas os marcadores e as camadas continuam funcionando.

## Código

- `src/lib/map.ts`: regras puras das camadas (missões, lixo, calor), textos pt/en/es e enquadramento.
- `src/components/map/eco-map.tsx`: o mapa Leaflet, compartilhado pelo site e pelo APK.
- `src/components/map/map-screen.tsx`: a tela do cidadão (camadas, cartão do marcador, "Onde estou", nota de privacidade).
- Web: `src/app/(app)/mapa/page.tsx` e `src/components/map/map-screen-web.tsx`. APK: `demo/src/screens/Map.tsx`.
- Testes: `tests/map.test.ts`, que cobre a regra das 5 pessoas, as missões feitas em casa, os status do lixo que podem aparecer, o filtro por região e a ausência de quem avisou.

## Próximos passos possíveis

- Pontos de coleta no mapa. Hoje eles têm só endereço e precisariam de latitude e longitude no cadastro.
- Página pública do mapa de calor por cidade, para prefeituras.
- Notificação de missão nova perto de você (push por proximidade).
