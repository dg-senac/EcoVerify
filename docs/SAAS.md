# EcoVerify como SaaS: como o projeto se paga

> Resumo: **o cidadão usa de graça, sempre**. Quem paga são **organizações** que querem engajar pessoas em ações ambientais e **provar o impacto**: escolas, empresas, prefeituras e ONGs. O dinheiro entra em **reais, por Pix, direto na sua conta**, sem intermediário.

## 1. De onde vem o dinheiro

| Fonte | Quem paga | Quanto (sugestão) | Onde fica no app |
| --- | --- | --- | --- |
| Plano **Escola** | escolas, cursos, Mediotec, universidades | R$ 79/mês ou R$ 790/ano | Organização → Plano |
| Plano **Empresa** | empresas (ESG, semana do meio ambiente, voluntariado) | R$ 349/mês ou R$ 3.490/ano | Organização → Plano |
| Plano **Prefeitura** | secretarias de meio ambiente/educação | sob consulta (ex.: R$ 1.500–5.000/mês) | Admin → Negócios → Plano manual |
| **Campanha patrocinada** | marca que banca missões com FONE | taxa de serviço de ~20% do valor da campanha, em reais | Admin → Missões → Patrocinadores (campo "Taxa R$") |

O plano **Comunidade** é grátis (até 30 pessoas e 3 missões): serve de porta de entrada. Os planos pagos começam com **14 dias grátis** (uma vez por responsável).

Os preços ficam em [`src/lib/plans.ts`](../src/lib/plans.ts); mude ali se quiser.

### O que cada plano libera

- **Todos:** missões próprias da organização (só pontos), ranking interno, página pública de impacto (`/o/<slug>`).
- **Escola / Empresa / Prefeitura:** relatório de impacto para imprimir ou salvar em PDF, certificados com QR code, moderação pela equipe (gestores além do responsável).
- **Empresa / Prefeitura:** cor da marca, exportação e FONE patrocinado.
- **Prefeitura:** demanda por cidade e suporte prioritário.

## 2. Como cobrar (Pix, sem intermediário)

1. Configure no servidor:
   ```env
   PIX_KEY=sua-chave-pix          # CPF/CNPJ, e-mail, telefone ou chave aleatória
   PIX_RECEIVER_NAME=Seu Nome     # até 25 letras
   PIX_RECEIVER_CITY=Recife       # até 15 letras
   SALES_EMAIL=voce@exemplo.com   # recebe o formulário do site (precisa de RESEND_API_KEY)
   SALES_WHATSAPP=5581999999999   # link "Prefere WhatsApp?"
   ```
2. O responsável pela organização abre **Plano**, escolhe Escola ou Empresa (mensal/anual) e toca em **Gerar Pix**. O app mostra o **QR code** e o **copia e cola** com o valor e uma referência (ex.: `EV7K2M9Q4T`).
3. Ele paga e toca em **Já paguei**. Você recebe uma notificação.
4. Você confere no extrato do banco se entrou o Pix com aquele valor e referência e toca em **Confirmar recebimento** em **Admin → 💼 Negócios**. O plano é ativado (ou renovado por mais um período) na hora e o cliente é avisado.

Sem `PIX_KEY`, a aba Plano mostra "Fale com a gente" (WhatsApp/e-mail) no lugar do QR code.

Contratos de prefeitura (empenho, boleto, nota) ou cortesias: use **Plano manual** em Admin → Negócios para dar qualquer plano por N meses.

> Quando o volume crescer, dá para trocar a confirmação manual por um provedor com webhook (Mercado Pago, Asaas, Efí, PagSeguro). A cobrança está isolada em [`src/lib/actions/billing.ts`](../src/lib/actions/billing.ts) e [`src/lib/saas/pix.ts`](../src/lib/saas/pix.ts).

## 3. Painel de receita (Admin → 💼 Negócios)

- **MRR** (receita recorrente mensal; planos anuais contam ÷ 12), recebido no mês (planos + taxas de campanhas) e total.
- Organizações pagantes, em teste e total, com vencimento e número de pessoas.
- Cobranças Pix aguardando confirmação (as que o cliente já disse que pagou aparecem primeiro).
- Contatos do formulário do site, com status (novo, em contato, fechado, perdido).

## 4. Como vender (roteiro curto)

- **Escolas (comece pelo Senac/Mediotec):** "Seus alunos fazem ações ambientais reais, com foto e GPS, e a escola recebe ranking da turma, relatório de impacto em PDF e certificado para cada aluno. Teste 14 dias grátis." Menores participam só com pontos; FONE só para maiores de 18.
- **Empresas:** semana do meio ambiente, metas ESG, voluntariado corporativo. O relatório e a página pública servem de prova para o relatório de sustentabilidade.
- **Prefeituras:** mutirões, coleta seletiva, educação ambiental nas escolas municipais, com dados por bairro/cidade.
- **Marcas (campanhas patrocinadas):** a marca deposita FONE para as recompensas, o EcoVerify cria as missões, modera e entrega o relatório, e cobra a taxa de serviço em reais.

Material pronto: o site público (`/` e `/sobre`), a página pública de cada organização e a demo offline (`?tour=1`), que agora tem um passo mostrando os planos e o Pix.

## 5. Cuidados legais e fiscais (leia antes de cobrar)

- **Formalize-se** antes de cobrar com frequência: MEI (atividade de desenvolvimento/licenciamento de software ou serviços de TI, se a sua atividade for permitida no MEI) ou CNPJ, e emita **nota fiscal de serviço** para cada pagamento. Prefeituras e empresas vão pedir nota. Se você for menor de 18, isso precisa de emancipação ou de um responsável. Converse com um contador.
- **Não venda FONE nem fique com parte do FONE.** A receita é **em reais, por serviço** (software e gestão de campanhas). O FONE dos patrocinadores vai inteiro para os participantes. Comprar/vender cripto para terceiros pode cair na Lei 14.478/2022 (prestadores de serviços de ativos virtuais).
- **Nunca prometa valor em reais** para o FONE nem "renda" para os participantes.
- **LGPD:** a página pública da organização mostra só números (sem nomes); o relatório com nomes é só para gestores; o certificado só abre com o link (o identificador é aleatório). Escolas devem informar os responsáveis dos alunos menores.
- **Contrato:** para Empresa e Prefeitura, use um contrato simples (objeto, prazo, valor, LGPD, cancelamento). Os Termos de Uso cobrem o uso geral.

## 6. Onde está no código

| Parte | Arquivos |
| --- | --- |
| Planos, preços e limites | `src/lib/plans.ts`, `src/lib/saas/org-rules.ts` |
| Organizações (dados/ações) | `src/lib/saas/orgs.ts`, `src/lib/actions/orgs.ts` |
| Cobrança Pix | `src/lib/saas/pix.ts` (BR Code + CRC16), `src/lib/actions/billing.ts`, `src/components/org/billing-panel.tsx` |
| Painel da organização | `src/app/(app)/org/[slug]/page.tsx`, `src/components/org/*` |
| Páginas públicas | `src/app/(site)/o/[slug]`, `relatorio/[slug]`, `certificado/[id]`, `sobre` |
| Site e contatos | `src/components/marketing/*`, `src/lib/actions/leads.ts` |
| Receita (admin) | `src/components/admin/business-tab.tsx` |
| Demo offline | `demo/src/screens/{Landing,Orgs}.tsx`, `demo/src/store.ts` (seção SaaS) |
