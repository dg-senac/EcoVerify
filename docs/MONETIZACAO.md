# Como o EcoVerify ganha dinheiro

> **Regra de ouro:** quem ajuda o meio ambiente usa **de graça, sempre**. Quem paga são as **organizações, marcas e comércios** que ganham com isso: engajamento, prova de impacto, clientes novos ou dados para decidir melhor. Todo o dinheiro entra **em reais** (Pix, boleto ou nota), **nunca em FONE**.

> **Pagamentos desligados por enquanto.** Pix, planos, mensalidades de comércios, recompensas em FONE, carteira e patrocinadores com orçamento em FONE estão escondidos das telas pela chave `PAYMENTS_ENABLED = false` em [`src/lib/features.ts`](../src/lib/features.ts) (vale para o app web e o APK). Enquanto isso, o app funciona com pontos, níveis, ranking e benefícios, e **toda organização tem todos os recursos liberados** (missões, eventos, relatório, certificados, moderação da equipe). O código continua no lugar: para ligar, mude a chave para `true`, revise os textos dos Termos e faça um novo build.

Há dois caminhos que se somam:

1. **Planos** (assinatura mensal ou anual) para escolas, empresas e prefeituras. Já estão prontos no app e explicados em [`SAAS.md`](SAAS.md).
2. **Receitas sem plano**, descritas aqui: o cliente paga por evento, por vitrine, por relatório ou por projeto, sem precisar assinar nada.

## Resumo das receitas sem plano

| # | Fonte | Quem paga | Preço sugerido | Onde fica no app |
| --- | --- | --- | --- | --- |
| 1 | [Eventos e mutirões](#1-eventos-e-mutirões) | escolas, empresas, ONGs, condomínios | R$ 300 a 1.500 por evento | Organização → Eventos |
| 3 | [Comércio local](#3-comércio-local-benefícios) | lojas, cafés, bicicletarias, academias | R$ 49 a 149/mês por vitrine | Benefícios (cidadão) · Admin → 🎁 Benefícios |
| 6 | [Reciclagem e logística reversa](#6-reciclagem-e-logística-reversa) | empresas com meta de logística reversa, cooperativas parceiras | R$ 500 a 3.000 por campanha de coleta | Missões de reciclagem com kg e material · Admin → Reciclagem |
| 7 | [Dados agregados](#7-dados-agregados-e-anônimos) | prefeituras, universidades, consultorias | R$ 300 a 2.000 por relatório | Admin → Dados (CSV) |
| 4 | [Editais, prêmios e bolsas](#4-editais-prêmios-e-bolsas) | governo, fundações, programas de inovação | R$ 5 mil a 100 mil (não reembolsável) | Kit pronto em [`EDITAIS.md`](EDITAIS.md) |

As campanhas patrocinadas por marcas (taxa de ~20% sobre o FONE da campanha) também não dependem de plano e já estão no app: veja [`SAAS.md`](SAAS.md#1-de-onde-vem-o-dinheiro).

**Ordem sugerida para começar:** eventos (1) e editais (4) já no primeiro mês, porque não exigem clientes recorrentes; comércio local (3) quando houver uma base de usuários numa cidade; reciclagem (6) e dados (7) quando houver volume de ações comprovadas.

---

## 1. Eventos e mutirões

**O que é:** a organização contrata um **evento avulso** (limpeza de praia ou de canal, plantio, coleta de recicláveis, gincana na semana do meio ambiente) e o EcoVerify cuida da parte digital: missão com data e local, link/QR para entrar, verificação das fotos, ranking do dia, **relatório do evento** e **certificados**.

**Por que pagam:** o relatório com fotos, GPS, horário e número de participantes é a prova que a escola mostra aos pais, a empresa coloca no relatório ESG e a ONG usa para pedir verba.

### Pacotes sugeridos

| Pacote | Até | O que inclui | Preço sugerido |
| --- | --- | --- | --- |
| **Mutirão P** | 50 pessoas | relatório do evento com fotos, certificados, limite de participantes ampliado | R$ 300 |
| **Mutirão M** | 200 pessoas | o mesmo do P, para turmas grandes e empresas | R$ 700 |
| **Mutirão G** | 500 pessoas | o mesmo do P; acima de 500, negocie à parte (apoio no dia, várias missões) | R$ 1.500 |

Os valores e limites estão em `src/lib/saas/events.ts` (`EVENT_PACKAGES`); mude ali se quiser outros preços.

Organizações que já têm plano Escola, Empresa ou Prefeitura fazem eventos sem custo extra (está incluso). O evento avulso serve justamente para quem **não quer assinar**.

### Como funciona no app

1. A organização (pode ser do plano grátis) cria a missão em **Missões** marcando **"É um evento"**, com data e horário de início e fim (de 30 min a 3 dias).
2. As comprovações só valem **dentro do horário do evento** (com 3 h de tolerância depois do fim, para quem ficou sem sinal). Antes do início a missão aparece como "Em breve"; depois de encerrada, sai da lista de missões e **não ocupa vaga** do limite de missões ativas do plano.
3. Os participantes entram pelo link/código de convite da organização. Com o evento pago, o limite de participantes sobe para o tamanho do pacote (de 7 dias antes até 7 dias depois do evento).
4. Na aba **Eventos**, o responsável escolhe o pacote e gera o **Pix do evento avulso** (separado do Pix do plano). Você confere o extrato e confirma em **Admin → 💼 Negócios**, onde a cobrança aparece com 🎪; o card "Recebido este mês" separa planos, eventos e campanhas.
5. Com o evento pago (ou com plano Escola, Empresa ou Prefeitura), ficam liberados:
   - o **relatório do evento** (`/evento/<id>`, só para gestores): participantes, ações aprovadas, kg reciclados, fotos e horário de cada um, pronto para imprimir ou salvar em PDF;
   - o **certificado de participação** de cada pessoa (`/certificado/evento/<id>`), com código e QR de verificação. O participante também encontra o dele na visão geral da organização.

### Roteiro de venda

> "No dia do mutirão, cada pessoa tira uma foto no local pelo app. A gente verifica e, no fim do dia, vocês recebem um relatório com o número de participantes, fotos e o mapa, mais um certificado para cada voluntário. Custa R$ 300 para até 50 pessoas."

Onde oferecer: escolas (semana do meio ambiente, feira de ciências), grupos de escoteiros, igrejas, condomínios, associações de bairro, empresas (voluntariado, SIPAT) e ONGs que já fazem mutirões no Recife (praias, Capibaribe, mangues).

---

## 3. Comércio local (benefícios)

**O que é:** comércios da cidade oferecem um **benefício** (desconto, brinde, café grátis) para quem já fez ações verificadas no app. O comércio paga uma **mensalidade pela vitrine** e ganha clientes novos e imagem verde.

### Como funciona no app

- O admin cadastra o parceiro e o benefício em **Admin → 🎁 Benefícios**: título, cidade, pontos mínimos, limite de resgates e validade.
- O cidadão vê os benefícios da sua cidade em **Benefícios**. Quando tem os pontos mínimos, toca em **Resgatar** e recebe um **código único**.
- **Resgatar não gasta pontos** (o ranking continua igual). Cada pessoa resgata cada benefício **uma vez**.
- No balcão, o comércio confere o código na **página de validação** dele (um link secreto, sem precisar de conta) e marca como usado.
- O admin vê quantos códigos foram gerados e usados por parceiro: esse número é o argumento para renovar a mensalidade.
- Se o link vazar, o admin gera um **novo link** (o antigo para de valer) ou **pausa** o benefício.
- **Experimente no demo:** entre como Maria → **Benefícios** → resgate o benefício da livraria (aberto a todas as idades) → declare 18+ para ver os outros. Depois, como Ana, **Admin → 🎁 Benefícios** → **Abrir** o link da livraria e digite o código: Maria recebe a notificação.

### Preços sugeridos

| Formato | Preço |
| --- | --- |
| Vitrine básica (1 benefício) | R$ 49/mês |
| Vitrine destaque (até 3 benefícios, aparece primeiro) | R$ 149/mês |
| Por resultado (alternativa) | R$ 2 a 5 por código **usado** |

### Cuidados

- **Menores de idade:** benefícios são mostrados **só para quem se declarou maior de 18** por padrão. Propaganda dirigida a crianças pode ser considerada abusiva (ECA e Resolução 163/2014 do Conanda). Só desmarque "Somente 18+" para benefícios neutros e educativos (ex.: entrada grátis num museu ou desconto em livraria) e nunca para bebidas, apostas ou produtos para adultos.
- O EcoVerify **não vende** os benefícios nem recebe parte do desconto: cobra só a vitrine.
- O comércio é responsável por cumprir a oferta. Deixe isso por escrito (mensagem ou contrato simples).

### Roteiro de venda

> "Tem gente no seu bairro limpando praça e reciclando pelo EcoVerify. Que tal dar 10% de desconto pra quem já fez 100 pontos? Você aparece no app pra todo mundo da cidade e paga R$ 49 por mês. No fim do mês eu te mando quantas pessoas usaram."

---

## 6. Reciclagem e logística reversa

**O contexto:** pela Política Nacional de Resíduos Sólidos (Lei 12.305/2010), fabricantes, importadores e comerciantes de embalagens precisam comprovar que recolhem e devolvem ao ciclo produtivo parte do que vendem (**logística reversa**). O Decreto 11.413/2023 criou certificados de crédito de reciclagem: cooperativas de catadores, prefeituras, empresas e MEIs que **vendem recicláveis com nota fiscal eletrônica** podem gerar esses créditos, que são homologados por um verificador independente e emitidos por uma entidade gestora. Cada tonelada equivale a um crédito, que as empresas compram para cumprir a meta.

**Onde o EcoVerify entra:** o app **não emite crédito de reciclagem** (isso exige nota fiscal da cooperativa, entidade gestora e verificador). Ele faz a parte que falta antes: **mobiliza as pessoas** e **registra cada entrega** com foto, GPS, data, material e peso, conferidos pela moderação. Isso:

- leva **mais material** para a cooperativa parceira (mais venda, mais nota, mais crédito para ela);
- dá à empresa patrocinadora uma **prova de engajamento e rastreabilidade** da campanha;
- gera números (kg por material, por cidade, por mês) que entram no relatório da organização.

### Como funciona no app

- Missões da categoria **Reciclagem** pedem o **material** (plástico, papel, metal, vidro, eletrônicos, óleo, outro) e o **peso aproximado em kg** na comprovação.
- O moderador confere a foto e pode **corrigir o peso** antes de aprovar.
- **Admin → ♻️ Reciclagem** mostra kg por material, por cidade e por mês, e exporta a **lista de coletas comprovadas em CSV** (data, cidade, ponto, material, kg e código da comprovação, sem nomes).

### Modelos de receita

| Modelo | Quem paga | Preço sugerido |
| --- | --- | --- |
| **Campanha de coleta** (ex.: "Junho do plástico") com relatório | empresa ou marca | R$ 500 a 3.000 por campanha + FONE de recompensa, se quiser |
| **Parceria com cooperativa** (o app leva gente para o ponto de entrega dela) | cooperativa ou entidade gestora | fixo mensal pequeno ou percentual combinado sobre o **aumento** de material, em reais |
| **Relatório de coleta** para a meta de uma empresa | empresa | por relatório (veja a seção 7) |

### Cuidados

- O peso é **declarado pelo cidadão e conferido pela foto**: é uma estimativa. Nos relatórios, chame de "peso declarado e verificado por foto", nunca de "massa certificada".
- Quem vende o material e emite a nota é a **cooperativa**. O EcoVerify não compra nem vende reciclável.
- Comece com **uma cooperativa** do Recife e um ponto de entrega fixo. Combine por escrito o que cada um faz.

---

## 7. Dados agregados e anônimos

**O que é:** com as ações verificadas, o EcoVerify sabe **onde** e **quando** acontecem limpezas, plantios e coletas, e quanto foi reciclado. Prefeituras, universidades e consultorias pagam por **relatórios com esses números**, por exemplo: "pontos com mais lixo recolhido por região da cidade" ou "kg de plástico entregue por mês".

### Como funciona no app

- **Admin → 🗺️ Dados** mostra totais por cidade, mês, categoria e por **área de cerca de 1 km** (para mapas de calor), e exporta tudo em **CSV**.
- **Anonimização obrigatória:**
  - só números agregados: nunca nome, e-mail, foto, relato ou o ponto exato de uma pessoa;
  - qualquer linha com **menos de 5 pessoas diferentes é ocultada** (assim ninguém é identificado por exclusão);
  - a coordenada é arredondada para uma grade de ~1 km.

### Produtos sugeridos

| Produto | Para quem | Preço sugerido |
| --- | --- | --- |
| Relatório da cidade (trimestral) | secretaria de meio ambiente | R$ 500 a 2.000 |
| Base de dados para pesquisa (CSV + explicação) | universidade, TCC, mestrado | R$ 300 (ou grátis em troca de citação e parceria) |
| Mapa de pontos críticos de lixo | prefeitura, ONG, consultoria | R$ 800 a 2.000 |

### Cuidados (LGPD)

- **Nunca venda dados pessoais.** Dados anonimizados de forma que não se possa identificar ninguém não são dados pessoais (LGPD, art. 12), mas a anonimização precisa ser real: por isso a regra das 5 pessoas e a grade de 1 km.
- A Política de Privacidade do app já precisa dizer que estatísticas agregadas e anônimas podem ser compartilhadas com parceiros. Revise o texto antes da primeira venda.
- Menores participam, então seja ainda mais conservador: nada de recortes muito pequenos (uma escola, uma turma) em relatórios vendidos para terceiros.

---

## 4. Editais, prêmios e bolsas

Dinheiro **não reembolsável** para tirar o projeto do papel. O 3º lugar no Fone Protocol SDK Hackathon e a matéria do Senac contam muito a favor.

O kit com textos prontos (resumo, problema, solução, impacto, indicadores, orçamento e cronograma) e a lista de onde procurar está em [`EDITAIS.md`](EDITAIS.md).

---

## Cuidados gerais (valem para tudo)

- **Formalize-se antes de cobrar com frequência**: MEI ou CNPJ, com **nota fiscal de serviço**. Se você for menor de 18, isso precisa de um responsável ou emancipação. Converse com um contador.
- **A receita é sempre em reais, por serviço.** Não venda FONE, não fique com parte do FONE e não prometa valor em reais pelo FONE.
- **Contrato simples** para eventos, vitrines e relatórios: o que será entregue, prazo, valor, uso dos dados e cancelamento.
- **Mostre os números:** o relatório do evento, os códigos usados no comércio e os kg recolhidos são o que faz o cliente pagar de novo.
