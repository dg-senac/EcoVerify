# Android Build Instructions

Este projeto usa Capacitor para gerar o APK Android do EcoVerify.

## Dois modos de APK

| Modo | Quando | O que o app faz |
|---|---|---|
| 🧪 **Demo offline** | `CAPACITOR_SERVER_URL` **não** configurada | Embute a demo de `demo/` (build em `demo/dist`). Roda inteiro no celular, sem internet, servidor ou banco. |
| 🌐 **Servidor** | `CAPACITOR_SERVER_URL` configurada (HTTPS) | Abre o app web Next.js real hospedado nessa URL. |

### O que tem na demo offline

- Perfis prontos: **Maria Santos** (cidadão), **Carlos Mendes** e **Ana Ribeiro**. O botão **Trocar perfil** permite testar o ciclo completo: enviar a comprovação como cidadão, aprovar como moderador e ver os pontos no ranking.
- As missões do Recife (Boa Viagem, Jaqueira, Marco Zero, Dona Lindu, Capibaribe e Olinda).
- Foto real da câmera, reduzida para cerca de 1024 px e salva no aparelho.
- Mesmas regras do servidor: raio de **150 m** e precisão do GPS, 5 envios por dia, foto repetida bloqueada pelo hash SHA-256, moderador não revisa a própria comprovação e pagamento só para quem tem carteira.
- Botão **"Simular que estou no local"**, para testar longe dos pontos das missões. O moderador vê o selo "Localização simulada".
- Ranking e chat da comunidade preenchidos com usuários fictícios.
- Carteira e saldo de FONE **simulados**: nenhum FONE real é movimentado.
- Banner permanente "Modo demonstração" e botão **Resetar demonstração** (no Perfil e nas Configurações).

Os dados ficam no `localStorage` do WebView. Desinstalar o app ou limpar os dados dele também apaga a demo.

## Build Local

### Pré-requisitos
- Node.js 20.9+
- Java 21
- Android SDK (platform 36, build-tools 36.0.0)

### APK de demonstração (sem servidor)

```bash
npm install
npm run demo:build          # gera demo/dist
npx cap sync android        # sem CAPACITOR_SERVER_URL => usa demo/dist
cd android
./gradlew assembleDebug
```

Para testar a demo no navegador antes de gerar o APK: `npm run demo:dev` (http://localhost:5173).

### APK conectado ao servidor

1. Instale as dependências:
```bash
npm install
```

2. Configure a URL HTTPS real do servidor Next.js:
```bash
export CAPACITOR_SERVER_URL="https://seu-dominio-de-producao.example"
```

3. Sincronize o projeto Android:
```bash
npx cap sync android
```

4. Build do APK debug:
```bash
cd android
./gradlew assembleDebug
```

Nos dois modos, o APK debug é gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`

> O `npx cap sync` cria `android/app/capacitor.build.gradle` e `android/capacitor.settings.gradle`. São arquivos gerados: não precisam ser commitados.

### Build de Release (Assinado)

Para distribuir o APK, você precisa assiná-lo com um keystore:

1. Gere um keystore:
```bash
keytool -genkey -v -keystore release.keystore -alias ecoverify -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure o keystore no `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword 'your-store-password'
            keyAlias 'ecoverify'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. Build do APK release:
```bash
cd android
./gradlew assembleRelease
```

O APK release será gerado em: `android/app/build/outputs/apk/release/app-release.apk`

## GitHub Actions Build

O projeto tem um workflow automatizado que constrói o APK no GitHub Actions.

### Ativar build automatizado de release

Para construir APKs assinados automaticamente:

1. Gere um keystore conforme acima
2. Converta o keystore para base64:
```bash
base64 release.keystore > keystore.base64
```

3. Adicione os secrets no GitHub (Settings > Secrets and variables > Actions):
   - `KEYSTORE_FILE_BASE64`: Conteúdo do arquivo keystore.base64
   - `KEYSTORE_PASSWORD`: Senha do keystore
   - `KEY_ALIAS`: Alias do keystore (ex: ecoverify)
   - `KEY_PASSWORD`: Senha da chave

4. Configure o `android/app/build.gradle` para usar os secrets (se necessário)

### Build Debug Automatizado

O workflow sempre constrói o APK debug, sem precisar de secrets:

- **Sem** a variável `CAPACITOR_SERVER_URL`, ele roda `npm run demo:build` e gera o **APK de demonstração** (artifact `ecoverify-demo-debug`).
- **Com** a variável (Settings → Secrets and variables → Actions → *Variables*), gera o **APK do servidor** (artifact `ecoverify-debug`).

O modo usado aparece no resumo da execução (aba *Summary*) e no título e na descrição da Release.

### Baixar o APK

Após o build:
1. Vá em Actions tab no GitHub
2. Selecione o workflow run
3. Baixe o artifact do APK desejado

## Configuração de Produção

Antes de build de produção:

1. Configure `CAPACITOR_SERVER_URL` com a URL HTTPS real do servidor Next.js (sem ela o APK é a demo offline)
2. Configure `DATABASE_URL` somente no ambiente do servidor Next.js
3. Configure o banco de dados de produção
4. Teste completamente em ambiente de staging

## Segurança

- Nunca commit keystores ou senhas
- Use GitHub Secrets para dados sensíveis
- Mantenha o keystore em local seguro
- Use senhas fortes para o keystore