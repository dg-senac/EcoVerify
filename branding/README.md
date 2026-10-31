# Marca EcoVerify

- `logo-source.png`: arte original escolhida (globo + folha com ✓, branco sobre degradê verde → azul).
- `icon-1024.png` / `play-store-512.png`: ícone quadrado para lojas e divulgação (Google Play pede 512×512).

Cores do degradê (de cima/esquerda para baixo/direita): `#2cc35f` → `#278c98` → `#2456d0`.

## Regerar todos os ícones

Trocou a arte? Substitua `logo-source.png` (símbolo **branco** sobre o degradê) e rode:

```bash
node scripts/brand-icons.mjs
```

O script gera:

| Onde | Arquivos |
|---|---|
| Android (ícone da tela do celular) | `android/app/src/main/res/mipmap-*/ic_launcher*.png` (legado, redondo e adaptativo em camadas: fundo, símbolo e monocromático para o tema do Android 13+) |
| Android (splash nativo) | `android/app/src/main/res/drawable*/splash.png`; no Android 12+ a cor e o ícone vêm de `values/styles.xml` |
| App (Next.js) | `src/app/icon.svg`, `src/app/apple-icon.png`, `public/icons/*` |
| Demo (Vercel + APK) | `demo/public/icon*.png`, `icon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og.jpg` (gerado por `scripts/og-image.mjs`, em inglês) |
| Dentro do app | `src/assets/brand/ecoverify/icon.png` (`LogoMark`) e `symbol.png` (splash animado) |

## Splash animado

`src/components/brand/app-splash.tsx`, usado pelo app e pela demo/APK:

1. Toda abertura do app (uma vez por sessão): o globo entra, depois "EcoVerify", o slogan e "Recompensas na rede FONE Protocol".
2. Só na primeira abertura: "Como funciona" em 4 passos (missão → foto com GPS → verificação → pontos e FONE) e o botão "Começar".

Toque na tela, "Pular" ou Esc encerram. Respeita "reduzir movimento". A marca Fone segue `docs/MARCA_FONE.md`
(logo branco, sem alteração, "Recompensas na rede", sem sugerir parceria oficial).
