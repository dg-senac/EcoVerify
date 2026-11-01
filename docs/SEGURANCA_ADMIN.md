# Conta de administrador segura

Como o EcoVerify protege a administração quando entrar em produção (com banco). Nada disso muda a demo.

## Princípios

- **Nenhuma senha passa por variável de ambiente, chat ou repositório.** O dono cria a conta no app, com a senha
  dele, como qualquer pessoa. O servidor só precisa saber **qual e-mail** é do dono.
- **O e-mail precisa ser confirmado** para virar admin. Assim ninguém consegue se cadastrar com o seu e-mail
  antes de você e ganhar o papel.
- **O dono não pode ser derrubado pelo painel.** Mesmo que alguém roube a sessão de outro admin, não consegue
  rebaixar nem banir o dono, nem criar novos admins.

## O que cada variável faz

| Variável | Efeito |
| --- | --- |
| `ADMIN_EMAILS` | E-mail(s) do dono, separados por vírgula. A conta vira admin ao confirmar o e-mail (ou no login seguinte). Não pode ser rebaixada, banida nem receber cartão pelo painel. **Enquanto a variável existir, só esses e-mails podem ser admin**: a opção "Administrador" fica "(reservado)" para os outros. |
| `MODERATORS_ENABLED` | Ligado por padrão: quem o admin torna Moderador (Admin → Usuários) usa o app como cidadão e também revisa e dá cartão amarelo (nunca nas próprias comprovações). `false` desliga o papel: a Moderação fica só com o admin. |
| `ALLOW_SEED_ACCOUNTS` | Desligado por padrão: as contas do seed (`@ecoverify.dev`, senha pública) **não entram em produção**, nem com sessão antiga, e não aparecem na tela de login. Só ligue num servidor de demonstração descartável. |

Outras proteções automáticas:

- Não dá para rebaixar ou banir o **último admin** ativo (o painel avisa para promover outra conta antes).
- Admins não recebem cartão.
- Login com limite de tentativas por e-mail e por IP. Banimento, troca de senha e exclusão derrubam as sessões.
- Em Admin → Usuários, o quadro **🔐 Segurança da administração** mostra se está tudo certo (✅) ou o que falta (⚠️):
  `ADMIN_EMAILS` definido, conta do dono criada, admins fora da lista, contas de exemplo e moderadores.

## Passo a passo (quando ligar o banco)

1. Na Vercel → Settings → Environment Variables, crie `ADMIN_EMAILS` com o seu e-mail. Não é preciso me enviar o
   e-mail nem a senha.
2. Confira que `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL` estão configurados (para o e-mail de confirmação chegar).
3. Faça o deploy, crie a sua conta no app e clique no link de confirmação. Pronto: você é admin (selo 👑 DONO).
4. **Sem e-mail configurado?** Quem tem acesso ao banco roda, na máquina com o `.env` de produção:
   `npm run admin:promote -- seu@email.com`. O script não pede nem mostra senha.
5. Não rode `npm run db:seed` em produção. Se rodou por engano, as contas de exemplo continuam bloqueadas.

## Próximos passos recomendados

- Verificação em duas etapas (TOTP) para admins.
- Registro de auditoria das ações de admin (quem baniu, quem pagou, quem deu cartão), exportável.
- Alerta por e-mail ao dono quando alguém vira admin ou quando um pagamento grande é feito.
