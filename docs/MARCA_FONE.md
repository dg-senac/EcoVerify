# Marca Fone no EcoVerify

O EcoVerify usa a marca **Fone Protocol** para mostrar, de forma honesta, onde as recompensas acontecem: na rede Fone, com a carteira oficial **Fone Wallet**.

> **Status da autorização: pendente.** Os arquivos abaixo são a arte oficial publicada em [fone.dev](https://fone.dev). Antes de divulgar o app publicamente (loja, imprensa, redes), confirme a autorização de uso da marca com a equipe da Fone e peça o kit de marca oficial (SVG, cores, área de respiro, versões aprovadas).

## Onde a marca aparece

| Elemento | Onde | Componente |
|---|---|---|
| Ícone "F" ao lado de valores em FONE | Cards de missão, envio de comprovação, perfil, histórico de pagamentos, painel admin (métricas, missões, carteiras, recompensas) | `FoneAmount` / `FoneMark` |
| "Recompensas na rede [Fone Protocol]" | Rodapé das telas de login/cadastro, menu lateral e menu mobile, painel da carteira, páginas de Termos e Privacidade | `PoweredByFone` |
| "Fone Wallet · App oficial da rede Fone" | Bloco de download da carteira | `FoneMark` |
| "Recompensas na rede [Fone Protocol]" (logo branco) e o "F" no passo "Ganhe recompensas" | Splash animado ao abrir o app e tela "Como funciona" | `AppSplash` |

A demo offline (`demo/`) usa os **mesmos componentes**, então o visual é idêntico ao do app real.

## Regras que o código segue

1. **Não misturar marcas.** O ícone da Fone aparece só junto de **FONE** (moeda, carteira, rede). Pontos continuam com ⭐ e as categorias ecológicas com os ícones do EcoVerify (o broto 🌱 não é mais usado para FONE).
2. **Não alterar a arte.** Sem recolorir, distorcer, girar ou recortar. O tamanho mantém a proporção original (`FoneProtocolLogo` calcula a largura a partir da altura).
3. **Contraste.** `variant="default"` (texto escuro) sobre fundo claro e `variant="white"` sobre fundo escuro ou colorido.
4. **Sem sugerir parceria oficial.** O texto é "Recompensas na rede Fone Protocol", nunca "app oficial da Fone" ou "parceiro Fone" enquanto não houver acordo formal. O EcoVerify é um projeto **independente** construído sobre a rede Fone (está escrito também nos Termos de Uso, seção 7).
5. **Link.** O selo leva a `https://fone.dev` (constante `FONE_SITE_URL` em `src/lib/fone.ts`).

## Arquivos

```
src/assets/brand/fone/
├── fone-protocol-logo.png        # logo completo, texto escuro (fundos claros)
├── fone-protocol-logo-white.png  # logo completo, texto branco (fundos escuros)
└── fone-mark.png                 # só o "F" (139×139), para valores em FONE
src/components/brand/fone.tsx     # FoneMark, FoneAmount, FoneProtocolLogo, PoweredByFone
```

Origem: `https://fone.dev/assets/image/logo_protocol.png` e `logo_protocol_dark.png` (out/2026). O "F" foi recortado do logo, sem alterar cor nem forma.

## Como trocar pelo kit oficial

1. Substitua os três arquivos acima mantendo os **mesmos nomes** (PNG com fundo transparente). Se o kit vier em SVG, troque a extensão nos imports de `src/components/brand/fone.tsx`, que funciona igual no Next.js e no Vite.
2. Se a proporção do logo completo mudar, atualize `LOGO_RATIO` (largura ÷ altura) em `src/components/brand/fone.tsx`.
3. Rode `npm run build` e `npm run demo:build` e confira as telas de login, missões, perfil (carteira) e admin.

Para **remover** a marca, se a Fone pedir: basta trocar o conteúdo de `FoneMark` por um ícone genérico e fazer `PoweredByFone` retornar `null`. Nenhuma outra tela importa os arquivos diretamente.
