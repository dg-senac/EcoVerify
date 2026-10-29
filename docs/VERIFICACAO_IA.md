# Verificação automática das comprovações (IA)

Cada foto enviada numa missão passa por uma verificação automática que **sugere** uma decisão à moderação e, nos casos claros, **aprova ou rejeita sozinha**, sempre com um motivo.

## Fluxo

```
Usuário envia foto + GPS + relato
  │  (regras que já existiam: raio de 150 m, precisão do GPS, 5/dia, SHA-256 igual = bloqueio)
  ▼
Servidor: remove EXIF, guarda a foto, calcula SHA-256 do original e hash perceptual (dHash 64 bits)
  ▼  responde ao usuário na hora; o resto roda em segundo plano (after())
Foto quase igual a outra da mesma missão ou do mesmo usuário?
  ├─ distância ≤ 4  → rejeição automática "foto repetida"
  ├─ distância ≤ 8  → moderação (suspeita)
  ▼
Gemini (foto reduzida a 1024 px, sem EXIF + missão + relato) → JSON validado
  ▼
decideProof() (src/lib/ai/decision.ts, função pura, usada também pela demo)
  ├─ aprovar: veredito "approve", confiança ≥ limite (padrão 85%), respostas coerentes e FONE da missão ≤ limite (padrão 50)
  ├─ rejeitar: veredito "reject", confiança ≥ limite (padrão 90%) e motivo "objetivo"
  │            (não combina com a missão, foto de tela, gerada/editada, imprópria, escura/borrada, repetida)
  └─ todo o resto → moderação, com a sugestão da IA visível no card
```

- **Relato incoerente** nunca rejeita sozinho (é subjetivo): vai para a moderação com a sugestão.
- **"Aprovar" contraditório** (o modelo aprova mas diz que a foto não combina, é de tela etc.) não é confiado: vai para a moderação.
- **Cota esgotada, erro, timeout ou resposta inválida** → a comprovação fica pendente, como antes da IA. O card mostra "A IA não conseguiu analisar" e o botão **Analisar de novo**.
- Aprovar/rejeitar usa o mesmo código da moderação humana (`src/lib/review.ts`): pontos, fila de FONE, notificação e proteção contra decisão dupla são idênticos. `decided_by` registra `ai` ou `human`.

## Contestação (LGPD, art. 20)

Rejeições automáticas mostram **Contestar** em *Minhas Submissões* (mensagem de 10 a 500 caracteres, uma vez por comprovação). A comprovação volta para *pendente*, aparece primeiro na moderação com a mensagem e só uma pessoa decide. A métrica "Contestações (revertidas)" na aba IA mostra quantas a moderação aprovou.

## Painel admin → 🤖 IA

| Ajuste | Padrão | Efeito |
|---|---|---|
| Modo | Automático | **Automático**: decide casos claros. **Só sugestão**: analisa tudo, decide ninguém (bom para calibrar). **Desligada**: nada sai do servidor. |
| Confiança mínima para aprovar | 85% | 50–100 |
| Confiança mínima para rejeitar | 90% | 50–100 |
| Aprovar sozinha só até | 50 FONE | Missões que pagam mais sempre passam por uma pessoa. |

Métricas: fotos analisadas, aprovadas/rejeitadas pela IA, enviadas à moderação, IA indisponível e contestações. A moderação lista as **decisões automáticas recentes** para auditoria.

No cadastro de missão há o campo opcional **"O que a IA deve conferir"** (até 500 caracteres), além do campo "Contexto". Exemplo: *"Sacos de lixo cheios na areia; luvas; a praia ao fundo."*

## Configuração

| Variável | Padrão | Observação |
|---|---|---|
| `GEMINI_API_KEY` | vazio | Chave grátis em <https://aistudio.google.com/apikey>. Sem chave, a IA fica desligada e só as regras locais (foto repetida) rodam. |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | Precisa aceitar imagem. O alias `-latest` é atualizado pelo Google com aviso de 2 semanas; para fixar, use um nome exato (ex.: `gemini-3.1-flash-lite`). |
| `GEMINI_API_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` | Só para testes (servidor falso) ou proxy. |

Depois de atualizar o código: `npm run db:push` (novas colunas em `submissions`, `missions.ai_checklist` e a tabela `ai_settings`).

## Privacidade (o que sai do servidor)

- **Enviado ao Google**: foto **reduzida** (lado maior 1024 px, JPEG, sem EXIF), título/descrição/contexto/checklist da missão e o relato do usuário (delimitado e tratado como dado, não como instrução).
- **Nunca enviado**: nome, e-mail, ID da conta, GPS, data, carteira.
- **Fotos guardadas sem EXIF** (antes ficavam com modelo do aparelho e GPS embutidos). O SHA-256 continua sendo do arquivo original, para manter o bloqueio de reenvio do mesmo arquivo.
- Exportação de dados inclui veredito, confiança, motivo, observações e contestação; a exclusão de conta apaga observações da IA e a mensagem de contestação.

### ⚠️ Plano gratuito do Gemini

O plano gratuito (sem faturamento) é ótimo para o piloto, mas:

1. **O Google pode usar o conteúdo para treinar e revisores humanos podem ler** (termos adicionais da Gemini API, plano não pago). Por isso: minimização acima, aviso na Política de Privacidade (seção 2) e orientação de não fotografar rostos nem pôr dados pessoais no relato.
2. **Cota por projeto e por dia** (Flash-Lite ≈ centenas a ~1.500 pedidos/dia, conforme o modelo; renova à meia-noite do Pacífico). Passou disso, as fotos vão para a moderação normalmente.
3. Antes do lançamento público, troque por **Gemini pago** (o conteúdo deixa de ser usado para treino; custo de frações de centavo por foto com Flash-Lite) ou por um **modelo aberto rodando no próprio servidor**. Toda a chamada fica em `src/lib/ai/gemini.ts`; outro provedor só precisa devolver o mesmo JSON (`parseAiAnalysis`).

## Na demo offline (APK / Vercel)

Não há IA de verdade nem servidor: em *Enviar comprovação* há **fotos de exemplo** (Mutirão de limpeza, Plantio, Reciclagem, Doação, Foto de tela). A categoria certa é aprovada sozinha, outra categoria é rejeitada ("não mostra a ação pedida"), a foto de tela é rejeitada e fotos da câmera vão para a moderação. A decisão usa o mesmo `decideProof` do servidor, e o card da moderação usa o mesmo `AiPanel`. Contestação e "Decisões automáticas recentes" funcionam igual (`demo/src/demoAi.ts`).

### IA de verdade na demo, com a sua chave (sem servidor e sem banco)

Em **Configurações → IA de verdade (sua chave do Gemini)**, quem testa pode colar a própria chave gratuita do [Google AI Studio](https://aistudio.google.com/apikey):

- A chave fica **só no `localStorage` do aparelho**, numa entrada separada (`ecoverify-demo-gemini-key`). Ela não entra no estado da demo nem no "Exportar meus dados", e nunca vai para o código, o GitHub ou o build. A **demo pública não tem chave nenhuma**: sem chave, tudo continua simulado.
- *Salvar e testar* confere a chave lendo os dados do modelo, o que não gasta a cota de análises. *Remover chave deste aparelho* apaga a chave.
- Com a chave, **fotos da câmera ou da galeria** vão do aparelho direto para o Gemini (`gemini-flash-lite-latest`), com o **mesmo prompt, o mesmo schema e o mesmo `decideProof` do servidor** (`src/lib/ai/gemini-core.ts`). A explicação vem no idioma do usuário. As **fotos de exemplo continuam simuladas**, porque são desenhos e um modelo real as rejeitaria.
- Todas as regras (relato, distância, limite diário, foto repetida) são conferidas **antes** de chamar o Gemini, para não gastar cota à toa.
- Se der erro (chave recusada, limite diário, sem internet), a comprovação vai para a moderação, com um aviso explicando o motivo. Na moderação aparece a origem da análise: "IA simulada" ou "Gemini (chave de teste)".
- Os cuidados do plano gratuito (abaixo) valem aqui também, e o card de Configurações avisa isso. Use uma chave só de testes, sem cobrança ativada.

**Não coloque a chave em *Secrets and variables* do GitHub para a demo.** A demo e o APK não têm servidor, então a chave teria que ir dentro do código publicado, e qualquer pessoa conseguiria extraí-la. Quando existir o servidor com banco, a chave vai nas variáveis de ambiente da hospedagem (`GEMINI_API_KEY`), nunca no app.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/lib/ai/decision.ts` | Motivos padronizados (PT/EN/ES), `decideProof`, validação do JSON. Puro, compartilhado com a demo. |
| `src/lib/ai/photo.ts` | Remove EXIF, reduz, dHash, distância de Hamming. |
| `src/lib/ai/gemini-core.ts` | Chamada ao Gemini: prompt, schema JSON, erros/timeout e teste da chave. Puro, compartilhado com a demo. |
| `src/lib/ai/gemini.ts` | Adaptador do servidor: lê `GEMINI_API_KEY`/`GEMINI_MODEL` e usa o `gemini-core`. |
| `demo/src/byok.ts`, `demo/src/components/GeminiKeyCard.tsx` | Chave própria na demo: guardar, testar, remover e analisar. |
| `src/lib/ai/pipeline.ts` | Orquestra: foto parecida → modelo → decisão → grava/aplica. |
| `src/lib/review.ts` | Aprovar/rejeitar (usado pela IA e pela moderação). |
| `src/components/moderation/ai-panel.tsx` | Sugestão da IA no card da moderação. |
| `src/components/admin/ai-tab.tsx` | Aba IA do admin. |
| `src/components/submissions/appeal-form.tsx` | Contestação. |

## Testes feitos

Ponta a ponta no navegador com Postgres local e um servidor Gemini falso (41 verificações): aprovação automática com pontos/FONE/notificação; rejeição por foto de tela com motivo e contestação; confiança baixa, cota esgotada (429), resposta inválida, "aprovar" contraditório, relato incoerente, missão acima do limite de FONE e veredito "revisar" indo para a moderação; foto redimensionada/recomprimida reconhecida como repetida; reanálise; motivo sugerido no modal de rejeição; modos "só sugestão" e "desligada"; e conferência do que foi enviado (chave no cabeçalho, JPEG ≤ 1024 px sem EXIF, prompt sem nome/e-mail/GPS) e do arquivo guardado (sem EXIF).
