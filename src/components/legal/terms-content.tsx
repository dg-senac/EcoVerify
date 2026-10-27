import { FONE_MIN_AGE, MIN_AGE, type LegalInfo } from "@/lib/legal";
import { LegalList, LegalSection, contactText } from "./legal-ui";

/**
 * Termos de Uso do EcoVerify (texto-base: revisar com advogado antes da publicação).
 * Ao alterar algo relevante, atualize TERMS_VERSION em src/lib/legal.ts.
 */
export function TermsContent({ info }: { info: LegalInfo }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">
        Estes Termos regulam o uso do EcoVerify, aplicativo que reconhece ações sustentáveis comprovadas (reciclagem, plantio,
        doações, mutirões) com pontos e, para maiores de idade, recompensas na criptomoeda FONE. O EcoVerify é mantido por{" "}
        <b>{info.controllerName}</b>. Ao criar uma conta, você declara que leu e concorda com estes Termos e com a Política de
        Privacidade.
      </p>

      <LegalSection n={1} title="Quem pode usar">
        <LegalList
          items={[
            <>É preciso ter <b>{MIN_AGE} anos ou mais</b>. Quem tem entre {MIN_AGE} e 17 anos só pode usar com autorização do pai, mãe ou responsável legal.</>,
            <>Recompensas em FONE são exclusivas para quem tem <b>{FONE_MIN_AGE} anos ou mais</b>. Menores participam com pontos, níveis e ranking.</>,
            "Cada pessoa pode ter uma única conta e uma única carteira FONE vinculada. Contas múltiplas, contas de terceiros ou automatizadas são proibidas.",
          ]}
        />
      </LegalSection>

      <LegalSection n={2} title="Sua conta">
        <p>
          Você é responsável por manter seu e-mail atualizado e sua senha em segredo. Avise-nos se suspeitar de uso indevido.
          Você pode excluir sua conta a qualquer momento em Configurações.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Missões e comprovações">
        <LegalList
          items={[
            "Envie apenas comprovações verdadeiras: a ação precisa ter sido feita por você, no local da missão, e a foto precisa ser sua e atual.",
            "O app usa a localização do aparelho no momento da comprovação para conferir se você está no local da missão.",
            "Cada comprovação passa por uma verificação automática (regras do app e um modelo de inteligência artificial) e pela equipe de moderação. Casos claros podem ser aprovados ou rejeitados automaticamente, sempre com o motivo informado; os demais são decididos por uma pessoa.",
            "Se uma comprovação sua for rejeitada automaticamente, você pode contestar em Minhas Submissões: a contestação é sempre analisada por uma pessoa da moderação.",
            "Fotos repetidas, montagens, fotos de tela, localização falsificada ou qualquer tentativa de fraude levam à rejeição e podem levar ao banimento e ao cancelamento de recompensas.",
            "Ao enviar uma foto, você autoriza o EcoVerify a armazená-la, a exibi-la à equipe de moderação e a enviá-la, reduzida e sem dados pessoais, ao serviço de verificação automática. Não publicamos sua foto fora do app sem a sua autorização. Evite fotografar rostos de outras pessoas.",
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="Pontos">
        <p>Pontos e níveis medem sua participação. Não têm valor em dinheiro, não podem ser vendidos, trocados ou transferidos.</p>
      </LegalSection>

      <LegalSection n={5} title="Recompensas em FONE">
        <LegalList
          items={[
            "FONE é a criptomoeda da rede Fone Protocol. As recompensas dependem do orçamento disponível do EcoVerify e de seus parceiros, e os valores das missões podem mudar.",
            "Para receber, é preciso ter 18 anos ou mais, e-mail confirmado e uma carteira da Fone Wallet vinculada e verificada (prova de que a carteira é sua).",
            "O EcoVerify não guarda suas chaves nem seus fundos: a carteira é sua e de sua responsabilidade. Transações em blockchain são públicas e irreversíveis; um endereço errado não tem como ser corrigido.",
            "Os pagamentos são feitos em lotes e podem levar alguns dias. Recompensas obtidas com fraude podem ser canceladas, inclusive depois de aprovadas, enquanto não tiverem sido pagas.",
            "Criptomoedas têm preço variável e podem perder valor. As recompensas não são investimento, salário nem promessa de ganho. Obrigações fiscais sobre o que você recebe são de sua responsabilidade.",
            "Se você excluir sua conta, recompensas ainda não pagas são perdidas.",
          ]}
        />
      </LegalSection>

      <LegalSection n={6} title="Comunidade">
        <p>
          No chat, trate todos com respeito. É proibido publicar conteúdo ilegal, ofensivo, discriminatório, sexual, violento,
          spam, golpes ou dados pessoais de outras pessoas. Mensagens podem ser denunciadas e removidas, e contas podem ser banidas.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Marcas">
        <p>
          O EcoVerify é um projeto independente construído sobre a rede Fone Protocol. Fone, Fone Protocol, Fone Wallet e seus
          logotipos pertencem aos seus respectivos titulares. O EcoVerify não é operado pela Fone e não responde pelos serviços
          dela, como a Fone Wallet.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Suspensão e encerramento">
        <p>
          Podemos suspender ou banir contas que descumprirem estes Termos, com indicação do motivo. Também podemos encerrar
          missões ou o serviço, avisando com antecedência sempre que possível.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Responsabilidade">
        <p>
          O app é oferecido como está. Fazemos o possível para mantê-lo seguro e disponível, mas não respondemos por falhas da
          rede Fone, da Fone Wallet, da internet ou do seu aparelho, nem por perdas decorrentes de variação de preço da FONE.
          Nada aqui limita direitos que a lei garante a você.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Alterações e contato">
        <p>
          Quando estes Termos mudarem de forma relevante, pediremos que você aceite a nova versão ao entrar no app. Dúvidas:{" "}
          {contactText(info.contactEmail)}. Estes Termos seguem a legislação brasileira.
        </p>
      </LegalSection>
    </div>
  );
}
