# Calculadora de impacto (CO₂e evitado) — metodologia

> **É uma estimativa.** Todo número de CO₂e no app aparece com o selo **"estimativa"** e um "Como calculamos" com os fatores e as fontes. **Não é crédito de carbono**: não pode ser vendido nem usado para compensar emissões.

## O que o app mostra

| Onde | O quê |
|---|---|
| Perfil do cidadão → "Meu impacto" | CO₂e evitado pelas **suas** entregas de reciclagem aprovadas + equivalência em km de carro. Também sai na imagem de compartilhar. |
| Admin → ♻️ Reciclagem | Total, km de carro e CO₂e **por material**. O CSV das coletas ganhou a coluna `kg_co2e_evitado_estimativa`. |
| Página pública / relatório da organização | Faixa verde com o CO₂e das entregas das missões da organização. |
| Relatório de mutirão (evento) | Card "CO₂e evitado (estimativa*)" com nota de rodapé sobre a metodologia. |

Só entram **entregas de reciclagem aprovadas** (material + kg). Plantio, limpeza e doação não viram CO₂e: não há como medir isso com honestidade a partir de uma foto.

## Conta

```
CO₂e evitado (kg) = Σ  kg entregues do material  ×  fator do material (kg CO₂e por kg)
```

Código: `src/lib/impact-factors.ts` (puro, usado pelo site, pelo APK e pelos testes em `tests/impact-factors.test.ts`).

### Fatores

Para os recicláveis usamos o **WARM v16 da EPA (EUA), dez/2023**, *Management Practices Chapters*, Exhibit 1-1. O fator compara **reciclar** com **mandar para o aterro**: `aterro − reciclagem`, em MTCO₂E por *short ton*. Para converter em kg por kg, dividimos por 0,90718474, porque 1 short ton = 907,18 kg.

| Material no app | Categoria WARM | Reciclagem | Aterro | **kg CO₂e / kg** |
|---|---|---|---|---|
| Plástico | Mixed Plastics | −0,93 | 0,02 | **1,05** |
| Papel e papelão | Mixed Paper (general) | −3,55 | 0,07 | **3,99** |
| Metal e latas | Mixed Metals | −4,39 | 0,02 | **4,86** |
| Vidro | Glass | −0,28 | 0,02 | **0,33** |
| Eletrônicos | Mixed Electronics | −0,90 | 0,02 | **1,01** |
| Outro | Mixed Recyclables | −2,80 | 0,03 | **3,12** |

**Óleo de cozinha** não existe no WARM. Contamos o diesel que ele substitui ao virar biodiesel, com valores da **diretiva europeia RED II (2018/2001)**:

- comparador fóssil: 94 gCO₂e/MJ;
- valor padrão do biodiesel de óleo de cozinha usado: 14,9 gCO₂e/MJ (Anexo V);
- energia do biodiesel: 37 MJ/kg (Anexo III);
- rendimento de **0,8 kg de biodiesel por kg de óleo coletado**. Esta é uma premissa conservadora nossa, porque o óleo coletado tem água, resíduos e perdas no processo.

O resultado é `(94 − 14,9) × 37 × 0,8 / 1000` = **2,34 kg CO₂e por kg**.

**Equivalência em carro:** 3,93 × 10⁻⁴ t CO₂e por milha (carro médio a gasolina, *GHG Equivalencies Calculator* da EPA) ÷ 1,609344 = **0,244 kg CO₂e/km**.

### Fontes

- US EPA — WARM v16, *Documentation for GHG Emission and Energy Factors, Management Practices Chapters* (EPA-530-R-23-018, dez/2023): https://www.epa.gov/waste-reduction-model/documentation-waste-reduction-model
- União Europeia — Diretiva (UE) 2018/2001 (RED II), Anexos III e V: https://eur-lex.europa.eu/eli/dir/2018/2001/oj
- US EPA — *Greenhouse Gas Equivalencies Calculator — Calculations and References*: https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references

## Limitações (por que é "estimativa")

1. **Os fatores são médias dos EUA/UE**, de modelos de ciclo de vida. O resultado real depende da matriz energética, do transporte e do destino que o material teria. No Brasil, a energia mais limpa tende a reduzir parte do ganho. Os fatores de papel incluem o carbono florestal, como o WARM faz.
2. **O peso é estimado** pela contagem de itens ou pesado na balança do ponto parceiro. Não é uma pesagem certificada.
3. **Pressupõe que o material seria aterrado.** Se ele já ia para a reciclagem de qualquer forma, o ganho adicional é menor.
4. **Material ausente ou desconhecido** conta como "recicláveis mistos" (3,12).
5. O WARM usa os GWPs do IPCC AR4. Mantivemos esses valores para que qualquer pessoa consiga reproduzir a conta.

## Por que não tem água

A ideia inicial era mostrar também a água economizada. **Não encontramos fator por material com fonte primária**: os números que circulam (por exemplo, "26.500 L por tonelada de papel" ou "1 L de óleo contamina 25 mil L de água") aparecem em sites secundários sem metodologia. Preferimos não mostrar a mostrar um número que não conseguimos defender. Se surgir uma fonte primária (ACV publicada, de preferência brasileira), basta acrescentá-la em `src/lib/impact-factors.ts` com o mesmo padrão: fator, fonte e testes.

## Como trocar um fator

1. Edite `WARM_V16` ou `COOKING_OIL` em `src/lib/impact-factors.ts` e atualize `IMPACT_SOURCES`.
2. Atualize a tabela acima.
3. Rode `npm test`. O teste `tests/impact-factors.test.ts` confere a conversão e falha se o valor mudar sem que o teste seja atualizado de propósito.
