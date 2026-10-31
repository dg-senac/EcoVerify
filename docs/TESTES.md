# Roteiro de testes sem banco (demo na Vercel e APK)

Este roteiro serve para testar o EcoVerify **antes de ligar o banco de dados**. Tudo roda na **demo offline**: os dados ficam só no aparelho de quem testa (no `localStorage` do navegador ou do APK). Não há servidor, não há e-mail e nenhum FONE ou Pix de verdade é movimentado.

Marque cada item com `[x]` quando passar. Se algo der errado, anote no modelo do fim da página (seção 6).

---

## 1. Onde testar

| Onde | Como abrir | Observações |
| --- | --- | --- |
| **Navegador (celular ou PC)** | https://eco-verify-ruddy.vercel.app/ | Atualiza sozinho a cada merge na `main`. |
| **Navegador, em outro idioma** | `…/?lang=en` ou `…/?lang=es` | O idioma também segue o do navegador. |
| **Apresentação guiada (3 min)** | `…/?tour=1` (ou o botão "Modo apresentação" no login) | Troca de perfil sozinha. |
| **"App" instalado pelo navegador** | No Chrome do Android: menu ⋮ › *Adicionar à tela inicial*. No iPhone (Safari): Compartilhar › *Adicionar à Tela de Início* | Depois da primeira visita, abre até sem internet. |
| **APK Android** | GitHub › *Releases* › a mais recente "EcoVerify Android APK vNN (Demo offline)" › baixe o `app-debug.apk` | Veja a seção 1.1. |

### 1.1 Instalando o APK

1. No celular Android, abra a página de *Releases* do repositório e baixe o `.apk` mais recente.
2. Ao abrir o arquivo, o Android pede para **permitir instalar apps desta fonte** (Chrome ou Arquivos). Permita só para isso.
3. Se já houver uma versão instalada, ela é atualizada **mantendo os dados**. Para começar do zero, use *Resetar demonstração* (em Configurações ou no Perfil).
4. O APK é *debug* (não assinado para a loja). O Play Protect pode avisar "app desconhecido": é esperado.

> Antes do merge, o APK de cada PR fica em **Actions › Build Android APK › (execução do PR) › Artifacts › `ecoverify-demo-debug`**. Para baixar, é preciso estar logado no GitHub.

### 1.2 Antes de começar

- **Perfis prontos:** Maria Santos (cidadã), Carlos Mendes e Ana Ribeiro. Dá para trocar de perfil no menu (*Trocar perfil*) sem sair.
- **Idioma:** o app abre sempre em **inglês**; troque para Português ou Español no seletor da tela de entrada ou em Configurações. *Restaurar dados iniciais* recria os textos no idioma em uso.
- **Telas sem aviso de demo:** o app não mostra faixa de "demonstração", "simulado" ou "sem banco". Só os avisos da IA (foto de exemplo, "análise simulada", chave do Gemini) continuam, para testar a API.
- **Cidade da demo:** Recife (há missões também em Olinda).
- **Começar do zero:** *Configurações › Resetar demonstração*.
- **Cada aparelho é um mundo separado.** O que a Maria faz no seu celular não aparece no celular de outra pessoa (isso só existe com o banco).

---

## 2. Teste rápido (5 minutos)

- [ ] Abrir o link → aparece direto a tela **"Experimente o EcoVerify"**, com os 3 perfis (sem página de propaganda antes).
- [ ] Tocar em **Modo apresentação (3 min)** e seguir os passos até "Pronto!". Cada passo troca de perfil e de tela sozinho, sem erro.
- [ ] No fim, a página **Transparência** abre com números de impacto e FONE pago, sem nomes de pessoas.
- [ ] Repetir com `?lang=en&tour=1`: todo o texto aparece em inglês.

---

## 3. Roteiro completo, por perfil

### 3.1 Entrada e conta de teste

- [ ] Entrar como **Maria**, sair (*Sair*) e entrar como **Carlos** e depois como **Ana**: cada um vê o menu do seu papel (Moderação só para Carlos/Ana, Admin só para Ana).
- [ ] **Criar conta de teste** ("ou crie sua própria conta de teste"):
  - [ ] Sem marcar os Termos → mensagem pedindo para aceitar.
  - [ ] Sem marcar a idade mínima (13 anos / autorização do responsável) → mensagem pedindo a confirmação.
  - [ ] Senha com menos de 8 caracteres → erro.
  - [ ] E-mail já usado (ex.: `cidada@ecoverify.dev`) → erro de e-mail existente.
  - [ ] Tudo certo → entra no app e recebe a notificação de boas-vindas.
- [ ] Os links de **Termos de Uso** e **Política de Privacidade** abrem e têm botão de voltar.

### 3.2 Maria: missões perto dela

- [ ] Em **Missões**, escolher a cidade (*Escolher cidade* › digitar "Recife") → aparecem **Perto de você** (ordenadas pela distância) e **Em qualquer lugar** (dá para fazer em casa).
- [ ] Mudar o **Raio** → a lista muda.
- [ ] *Ver todas* → mostra todas as missões.
- [ ] Trocar para **Olinda** → aparece a missão do óleo de cozinha de Olinda.
- [ ] Escolher uma cidade **sem missões** (ex.: Caruaru):
  - [ ] Depois de uma busca curta, o app cria **missões de exemplo** para a cidade (no app real elas vêm do OpenStreetMap). Elas dão **só pontos** até a Ana revisar.
  - [ ] *Quero mais missões aqui* → "Pedido registrado ✓".
  - (Sugerir uma ação só existe no app com servidor.)
- [ ] Permitir o **GPS do aparelho** (*Usar minha localização*) → a região vira "pela sua localização". Negar a permissão → o app explica e deixa escolher a cidade.

### 3.3 Maria: comprovação e a IA (simulada)

Sem chave, a IA da demo é **simulada** pela foto de exemplo escolhida (para a IA de verdade, veja a seção 3.3.1). Abra uma missão, toque em comprovar e use **"Sem câmera? Use uma foto de exemplo"**:

| Teste | O que escolher | Resultado esperado |
| --- | --- | --- |
| [ ] Foto certa | Exemplo da **mesma categoria** da missão (ex.: Reciclagem em "Separe o lixo reciclável em casa") | **Aprovada sozinha**, com o motivo "A foto mostra a ação pedida…" e os pontos creditados. |
| [ ] Categoria errada | Exemplo de **outra categoria** (ex.: Plantio numa missão de reciclagem) | **Rejeitada sozinha**, com o motivo "A foto mostra outro tipo de ação…". |
| [ ] Foto de tela | **Foto de tela** | **Rejeitada**, com o motivo "Parece a foto de uma tela de celular…". |
| [ ] Foto da internet | **Foto da internet** (imagem com marca d'água "© fotosgratis") | Fica **pendente**: a IA não decide sozinha. Carlos e Ana recebem a notificação "⚠️ Possível foto da internet". |
| [ ] Foto real | **Câmera** do celular (ou arquivo do PC) | Vai para a **moderação** (Carlos), com o aviso de que a demo não tem IA real. |

Também conferir:
- [ ] Abaixo da foto aparece o aviso "Fotos copiadas da internet são detectadas e analisadas pela equipe".
- [ ] Relato com **menos de 50 caracteres** → o contador "Faltam N caracteres" impede o envio.
- [ ] Missão **local** (ex.: Praia de Boa Viagem) longe do local → o app mostra a distância. **Usar o local da missão** libera o envio (a moderação vê o selo "Local da missão") (no app real, é preciso estar a até 150 m).
- [ ] Em **Minhas Submissões**, abrir a comprovação rejeitada automaticamente › **Contestar** › escrever o motivo › *Enviar contestação* → status "Contestação em análise". Tentar contestar de novo → "Você já contestou esta decisão".
- [ ] As **Notificações** mostram cada aprovação/rejeição com o motivo, e *Marcar todas como lidas* zera o contador.

### 3.3.1 IA de verdade com a sua chave do Gemini (opcional)

Precisa de internet e de uma chave grátis do [Google AI Studio](https://aistudio.google.com/apikey) (*Create API key*; as chaves novas começam com `AQ.`, as antigas com `AIza`). Use uma chave só de testes, sem cobrança ativada. **Nunca** coloque a chave no GitHub (nem em *Secrets*) ou em grupos.

- [ ] **Configurações → IA de verdade (sua chave do Gemini)** aparece com o selo "IA simulada".
- [ ] Colar um texto qualquer → "Isso não parece uma chave do Gemini".
- [ ] Colar a chave → *Salvar e testar* → "Chave funcionando ✓" e o selo muda para "🤖 Gemini ativo". A chave aparece mascarada (ex.: `AQ.Ab8••••ab12`).
- [ ] Chave errada (apague uma letra) → "O Google recusou a chave".
- [ ] Ao comprovar uma missão, a foto da **câmera** mostra o aviso "Esta foto será analisada pelo Gemini de verdade". O botão mostra "Analisando com o Gemini…".
- [ ] **Foto real que combina** com a missão (ex.: recicláveis separados em "Separe o lixo reciclável em casa") → aprovada sozinha, com a explicação do Gemini no idioma do app.
- [ ] **Foto de uma tela** (fotografe outra tela mostrando a ação) → rejeitada sozinha, com o motivo de foto de tela.
- [ ] **Foto sem relação** (ex.: um teclado) → rejeitada ou enviada para a moderação, com o motivo.
- [ ] Como **Carlos**, os casos duvidosos aparecem na Moderação com o selo "🤖 Gemini (chave de teste)" e a sugestão da IA.
- [ ] **Sem internet** (modo avião) com a chave salva → aviso "Sem conexão com o Google" e a comprovação vai para a moderação.
- [ ] As **fotos de exemplo** continuam simuladas, mesmo com a chave salva.
- [ ] **Exportar meus dados** não contém a chave.
- [ ] *Remover chave deste aparelho* → volta para "IA simulada".

> O plano gratuito tem limite diário de análises. Se aparecer "Limite gratuito do Gemini atingido", espere o dia seguinte. No plano gratuito, o Google pode usar as fotos para melhorar os modelos: evite rostos e dados pessoais.

### 3.4 Carlos: moderação

- [ ] O menu **Moderação** mostra um contador de pendentes (a demo começa com 3).
- [ ] Abrir uma comprovação: aparecem a foto (que dá para ampliar), o relato, a distância até o local, o histórico da pessoa e a sugestão da IA (quando houver).
- [ ] **Aprovar** → some da fila. Ao trocar para a Maria (se for dela), aparecem a notificação e os pontos.
- [ ] **Rejeitar** escolhendo um **motivo padronizado** (ou escrevendo um com pelo menos 5 caracteres) → a pessoa recebe o motivo.
- [ ] A comprovação com **Foto da internet** (3.3) aparece no **topo da fila**, com o selo vermelho **⚠️ Possível cópia da internet**, os sinais vistos e os botões **⬇️ Baixar foto** e **🔎 Abrir Google Lens**.
- [ ] No mesmo alerta aparece **"🌐 A mesma foto foi encontrada na internet"** com dois links de exemplo (busca reversa simulada; no servidor é o Google Cloud Vision). As outras amostras mostram "Busca reversa: nada encontrado".
- [ ] **Rejeitar** essa comprovação: o motivo "copiada da internet" já vem marcado e o botão só libera depois de você **escrever sua própria explicação** (15 caracteres ou mais; só o texto pronto não basta). A Maria recebe o motivo + "Explicação da equipe: …".
- [ ] A **contestação** feita pela Maria (3.3) aparece com o selo "Contestação", o texto dela e o motivo anterior.
- [ ] A seção de **decisões recentes da IA** lista o que foi aprovado ou rejeitado sozinho (para auditoria).
- [ ] Se o Carlos enviar uma comprovação, ele vê o aviso de que **não pode moderar a própria**.
- [ ] **Cartão amarelo na rejeição:** ao rejeitar por um motivo de fraude (foto da internet, de tela, repetida, localização falsa…), aparece a caixa **"Dar cartão amarelo"**. Ela não aparece para motivos de erro honesto (foto escura, fora do local por engano). Marcar e confirmar → a Maria recebe "🟨 Cartão amarelo" com a explicação escrita pelo Carlos.

> **Moderação só para admin:** no app real a Moderação começa **só com administradores** (`MODERATORS_ENABLED` desligado). Na demo ela começa liberada para você testar o Carlos; a Ana pode desligar em **Admin → Usuários** (ver 3.5).

### 3.5 Ana: administração

**Métricas**
- [ ] Os números (usuários, missões ativas, aguardando moderação, aprovadas, FONE pago, FONE na fila) mudam conforme os testes anteriores.

**Missões**
- [ ] **Nova missão** com título, descrição, categoria, pontos, FONE e local (*Usar minha localização* ou latitude/longitude). Marcar "Pode ser feita em qualquer lugar" → missão de casa. Formulário incompleto → "Preencha todos os campos corretamente".
- [ ] **Para revisar** (missões criadas para cidades sem missões, da 3.2): *Aprovar com FONE*, *Manter só pontos* ou *Desativar*.
- [ ] **Cidades pedindo missões** mostra o pedido da 3.2.
- [ ] Desativar e reativar uma missão → ela some e volta para a Maria.

**Usuários**
- [ ] Mudar o papel de alguém (cidadão ↔ moderador).
- [ ] **Banir** com motivo → o usuário aparece como BANIDO, com o motivo e a data. **Desbanir** desfaz.
- [ ] Sair e escolher o perfil banido → abre a tela **"Sua conta está bloqueada"**, com o motivo, a data e o formulário **"Acha que foi um engano?"** (mínimo de 20 caracteres). Enviar → "Contestação recebida…". O app não entra na conta.
- [ ] Como Ana: chega a notificação "⚖️ Contestação de bloqueio" e, em **Usuários**, a pessoa aparece no topo com o texto da contestação. O moderador não recebe esse aviso.

**Cartões e suspensão** (regras completas em `docs/CARTOES.md`)
- [ ] A demo começa com um cartão de exemplo: o **Rafael** mostra o selo 🟨 1/3 na lista.
- [ ] **Ficha** de qualquer pessoa → situação, pontos, comprovações aprovadas/rejeitadas/pendentes, FONE pago/a pagar, cartões e o formulário **Dar cartão** (amarelo ou vermelho, motivo e explicação de 15+ caracteres).
- [ ] Dar o **3º amarelo** válido à Maria → ela fica **SUSPENSA por 14 dias**: aparece o selo com a data, a caixa "Suspenso até…" e o aviso de que os FONE a pagar ficam **congelados**. Em Recompensas, pagar a Maria → "Conta suspensa ou bloqueada: o FONE fica congelado".
- [ ] Sair e escolher a Maria → tela **"Sua conta está suspensa"**, com o motivo, a data de volta e o formulário de contestação. O app não entra.
- [ ] Na Ficha, **Encerrar suspensão agora** → a Maria entra de novo e recebe "✅ Suspensão encerrada".
- [ ] **Cartão vermelho** → bloqueia a conta (igual ao banimento). **Cancelar cartão** no vermelho → desbloqueia.
- [ ] **Contestações de cartões:** quando a Maria contesta um cartão (3.6), a aba mostra **Usuários (1)** e o painel "⚖️ Contestações de cartões". *Aceitar* cancela o cartão (e desfaz a suspensão se foi ele que suspendeu); *Manter* avisa a Maria que o cartão continua.
- [ ] **Moderadores podem revisar comprovações:** desligar → o Carlos entra direto em Missões, sem o menu Moderação, e `#/moderation` volta para Missões. Ligar de novo para seguir os testes.

**Recompensas (FONE simulado)**
- [ ] A fila mostra os FONE "em carência" (7 dias) e o aviso de mínimo de 5 FONE e da taxa da rede (≈ 0,15 FONE).
- [ ] **⏩ Antecipar fim da carência** → *Pagar N FONE* → vai para "Pagos recentemente". A Maria recebe a notificação "FONE enviado 🪙" e vê o valor no Perfil.
- [ ] Recompensa de alguém **sem carteira verificada** → aviso "Usuário sem carteira verificada" e não paga.
- [ ] **Regras de pagamento:** baixar o orçamento mensal para um valor pequeno e salvar → novas aprovações com FONE ficam **em espera** (os pontos continuam valendo). Depois, **Liberar** → voltam para a fila.
- [ ] **Patrocinadores:** criar um patrocinador com orçamento, criar uma missão paga por ele, aprovar comprovações até o saldo acabar → o FONE fica em espera. *Recarregar* → libera.

**💼 Negócios** (ver também 3.8)
- [ ] Mostra receita recorrente (MRR), recebidos, organizações em teste e os **Pix aguardando confirmação**.

### 3.6 Carteira, perfil, ranking e comunidade

**Carteira** (use uma **conta de teste nova**: logo depois de criar a conta, o app abre a etapa da carteira; ela também fica em Perfil › Carteira FONE)
- [ ] Sem marcar "Declaro que tenho 18 anos ou mais" → não deixa vincular.
- [ ] *Usar endereço de exemplo* → o app mostra o **valor exato** a enviar (ex.: 1.37 FONE).
- [ ] Endereço `0x…` ou com tamanho errado → erro de formato.
- [ ] *Já enviei — verificar* → "Carteira verificada ✅".
- [ ] **Menor de idade:** uma conta que nunca marca a declaração de 18+ continua ganhando **pontos e ranking**, mas o FONE não é pago.

**Perfil e ranking**
- [ ] O Perfil mostra nível, pontos, FONE recebido, FONE a receber, ações aprovadas e o histórico com link de transação (simulado).
- [ ] O **Ranking** coloca a Maria na posição certa, conforme os pontos ganhos nos testes.
- [ ] **Meus cartões** (no Perfil): sem cartões → "Nenhum cartão". Com cartão → tipo, motivo, explicação da equipe e "Vale até…". *Contestar* (20+ caracteres) → "Contestação enviada"; só dá para contestar uma vez.

**Comunidade (só cidadãos)**
- [ ] Como Maria: enviar mensagem, **responder** uma mensagem e **apagar** a própria.
- [ ] Como Carlos ou Ana: aparece o aviso "O chat da comunidade é exclusivo para cidadãos".
- [ ] (GIF e áudio só existem no app com servidor.)

### 3.7 Configurações, acessibilidade e LGPD

- [ ] **Idioma** PT/EN/ES → o app inteiro muda, inclusive missões e notificações.
- [ ] **Tema** claro/escuro/sistema → o modo noturno fica legível em todas as telas: missões, comprovação, moderação, admin, organizações, relatório.
- [ ] **Tamanho da fonte**, **Alto contraste** e **Reduzir animações** funcionam e continuam valendo depois de fechar e abrir.
- [ ] **Exportar meus dados** → baixa um JSON com os dados da conta.
- [ ] **Excluir minha conta** (numa conta de teste) → pede confirmação, apaga e volta para o login. Nas mensagens, o nome vira "Conta excluída".
- [ ] **Resetar demonstração** → tudo volta ao estado inicial.

### 3.8 Organizações (escolas, empresas, prefeituras)

**Como gestor (Carlos, dono da "Escola Técnica Horizonte")**
- [ ] Menu **Organizações** › Escola Técnica Horizonte → abas Visão geral, Missões, Moderação, Membros, Plano e Relatório.
- [ ] **Missões:** criar uma missão só da escola (dá **só pontos**). Aparece o limite do plano (ex.: "3 de N missões").
- [ ] **Moderação:** aprovar/rejeitar comprovações das missões da escola.
- [ ] **Membros:** ver o código de convite `ESCOLA24`, gerar um novo e ver o ranking interno.
- [ ] **Relatório:** números de impacto e lista por participante. *Imprimir / salvar PDF* gera um PDF legível (sem menu e sem botões).
- [ ] **Certificado** de um participante → abre com QR code e imprime bem.

**Como participante (conta de teste nova)**
- [ ] *Organizações* › digitar `ESCOLA24` → entra na escola. A missão criada pelo Carlos aparece em Missões e vale só pontos.
- [ ] Código inválido → mensagem de erro.
- [ ] O participante vê só a Visão geral, sem as abas de gestão.

**Plano e Pix (simulado: NÃO pague o Pix da demo)**
- [ ] Criar uma organização própria (*Criar organização*) escolhendo o plano **Escola** → começa com **14 dias grátis**. Com o plano **Comunidade** (grátis), o limite é de 30 pessoas e 3 missões.
- [ ] Aba **Plano** › mensal/anual › **Gerar Pix** → aparecem o QR code, o *copia e cola* e o aviso azul de que a chave é fictícia.
- [ ] **Já paguei** → mensagem de agradecimento.
- [ ] Trocar para **Ana › 💼 Negócios** → o Pix aparece em "Pix aguardando confirmação" › **Confirmar** → o plano da organização fica **ativo** e o MRR sobe.
- [ ] Cancelar uma cobrança pendente → some da lista.

### 3.9 Páginas públicas

- [ ] **Transparência** (link na tela de login e no fim do tour): impacto total, FONE pago, patrocinadores e regras, **sem nomes**.
- [ ] Termos e Privacidade abrem também sem login.

---

## 4. Específico do APK e do celular

- [ ] **Ícone novo** (globo com folha) na tela do celular, com o nome "EcoVerify". Em temas com ícones monocromáticos (Android 13+), o globo aparece no estilo do tema.
- [ ] **Splash:** ao abrir, o globo aparece sobre o degradê e segue a animação (nome, slogan, "Recompensas na rede FONE"). Na **primeira** abertura vem "Como funciona" em 4 passos; "Começar" ou "Pular" entra no app. Nas próximas aberturas, só a animação curta.
- [ ] Primeira abertura **em modo avião**: o app abre e funciona inteiro.
- [ ] **Câmera:** na comprovação, *tirar foto* abre a câmera traseira; a foto aparece na prévia e vai para a moderação.
- [ ] **Permissões:** o Android pede localização e câmera só na hora de usar. Negar não trava o app.
- [ ] Botão **voltar** do Android volta para a tela anterior (não fecha o app no meio de um formulário).
- [ ] Girar o celular / teclado aberto: nada fica escondido atrás do teclado ou da barra inferior.
- [ ] Fechar o app (tirar dos recentes) e abrir de novo → continua logado com os mesmos dados.
- [ ] Atualizar o APK por cima → os dados continuam. Se o formato dos dados mudou, o app recria a demo sozinho, sem tela branca.
- [ ] Telas pequenas (≈ 360 px) e grandes (tablet/PC): nada cortado; a barra de navegação inferior aparece no celular.
- [ ] Navegadores: Chrome (Android), Safari (iPhone) e um navegador de PC.

---

## 5. O que a demo NÃO testa (fica para depois do banco)

| Recurso | Por quê |
| --- | --- |
| Login real, confirmação de e-mail, troca de senha | Precisa do servidor e do Resend. |
| Vários usuários vendo os mesmos dados (ranking e chat reais) | Cada aparelho tem a própria demo. |
| IA real com a chave do projeto | Precisa do servidor com `GEMINI_API_KEY`. Na demo dá para testar a IA real com a **sua** chave (seção 3.3.1). |
| Missões automáticas do OpenStreetMap | Na demo os lugares são de exemplo. |
| Busca reversa automática de verdade | Na demo ela é simulada (links `.example`). No servidor usa o Google Cloud Vision com `GOOGLE_VISION_API_KEY` (conta com cobrança; 1.000 fotos/mês grátis). |
| Conta de admin pelo `ADMIN_EMAILS`, contas de exemplo bloqueadas | Precisam do servidor e do banco. Ver `docs/SEGURANCA_ADMIN.md`. |
| Tela de conta bloqueada com senha real (`/conta-bloqueada`) | No servidor, ela abre ao entrar com a senha certa, por um link que vale 30 minutos e não cria sessão. Na demo, abre ao escolher o perfil banido. |
| Chave `MODERATORS_ENABLED` do servidor | Na demo ela é a opção da Ana em Admin → Usuários. |
| FONE de verdade e conferência no explorer | Os pagamentos são simulados. |
| Pix de verdade | A chave da demo é fictícia. |
| GIFs e áudios no chat, sugerir uma ação | Precisam do servidor. |

---

## 6. Como relatar um problema

Copie, preencha e mande (WhatsApp ou uma *Issue* no GitHub, onde já existe o modelo "Problema na demo"):

```
Onde: (Vercel no Chrome do Android / APK vNN / Safari do iPhone / PC)
Aparelho e versão do Android/iOS:
Perfil: (Maria / Carlos / Ana / conta de teste)
Idioma e tema: (PT, claro)
Passo do roteiro: (ex.: 3.3, "Categoria errada")
O que eu fiz:
1.
2.
O que eu esperava:
O que aconteceu:
Print ou vídeo: (anexe)
Acontece sempre? (sim / às vezes / só uma vez)
```

**Gravidade** (ajuda a priorizar):
- 🔴 **Bloqueia:** tela branca, app fecha, impossível concluir um fluxo.
- 🟠 **Errado:** resultado diferente do esperado (pontos, status, valor).
- 🟡 **Visual/texto:** layout quebrado, tradução faltando, texto confuso.
- 💡 **Sugestão:** ideia de melhoria.

---

## 7. Quando passar para o banco de dados

Dá para seguir para a fase com banco quando:

- [ ] O teste rápido (seção 2) passa na Vercel **e** no APK.
- [ ] As seções 3.2 a 3.5 passam sem nenhum 🔴 e sem 🟠 abertos.
- [ ] Pelo menos **3 pessoas de fora** (ex.: colegas do Mediotec) testaram com o roteiro e relataram.
- [ ] Os testes de 3.7 (modo noturno e acessibilidade) passam em pelo menos um celular.

Depois disso, siga o README (*Rodando localmente* e *Variáveis de ambiente*): `npm run db:push`, as variáveis de produção e o passo a passo da conta de admin em `docs/SEGURANCA_ADMIN.md` (defina `ADMIN_EMAILS`, crie sua conta e confirme o e-mail). Em produção, não rode o `npm run db:seed`.

---

## 8. Modo servidor: o que já foi verificado (v1.9.1)

Antes de existir o banco de produção, o app com servidor foi testado num **Postgres local** (schema com
`drizzle-kit push` + `npm run db:seed`), com navegador automático nos 3 perfis:

- Todas as páginas abrem para cidadã, moderador e admin, sem erro no console.
- Comprovação com foto + GPS → pendente; foto repetida é barrada; foto **reaproveitada** (redimensionada/recomprimida)
  é rejeitada sozinha como "foto reaproveitada", mesmo **sem** chave de IA.
- Admin: aprovar (+pontos, FONE na fila), rejeitar com cartão amarelo, notificações e histórico da pessoa.
- 3 amarelos → suspensão de 14 dias → tela `/conta-bloqueada` → contestação → admin encerra a suspensão → a pessoa entra de novo.
- Contestação de cartão, chat da comunidade, criar organização, sugerir ação, escolher cidade, ranking.
- Configurações (idioma, tema), baixar meus dados (JSON), excluir conta, cadastro, recuperar senha.
- Abas do Admin (Métricas, Negócios, Missões, Usuários, Carteiras, Recompensas, IA).

Para rodar o servidor em desenvolvimento pelo **Codespaces** ou por `127.0.0.1`, nada a configurar; outro endereço
vai em `DEV_ALLOWED_ORIGINS` (veja `.env.example`).
