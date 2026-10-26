import { MIN_AGE, type LegalInfo } from "@/lib/legal";
import { LegalList, LegalSection, contactText } from "./legal-ui";

/**
 * Política de Privacidade do EcoVerify, alinhada à LGPD (Lei 13.709/2018).
 * Texto-base escrito a partir dos fluxos reais de dados do app: revisar com advogado.
 */
export function PrivacyContent({ info }: { info: LegalInfo }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">
        Esta Política explica quais dados pessoais o EcoVerify trata, por quê e quais são os seus direitos. O controlador dos
        dados é <b>{info.controllerName}</b>. Contato para assuntos de privacidade (encarregado): {contactText(info.contactEmail)}.
      </p>

      <LegalSection n={1} title="Dados que tratamos e para quê">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Dado</th>
                <th className="py-2 pr-3 font-semibold">Finalidade</th>
                <th className="py-2 font-semibold">Base legal (LGPD, art. 7º)</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {[
                ["Nome, e-mail e senha (guardada só como hash)", "Criar e proteger sua conta, enviar avisos de conta", "Execução de contrato (V)"],
                ["Fotos, relato e localização (GPS) no momento da comprovação", "Conferir se a ação aconteceu no local da missão e moderar", "Execução de contrato (V) e legítimo interesse na prevenção de fraude (IX)"],
                ["Impressão digital (hash) das fotos", "Impedir que a mesma foto seja reutilizada", "Legítimo interesse na prevenção de fraude (IX)"],
                ["Endereço da carteira FONE, transação de verificação e declaração de 18 anos", "Provar que a carteira é sua e pagar recompensas só a maiores", "Execução de contrato (V)"],
                ["Pontos, recompensas e pagamentos", "Ranking, histórico e prestação de contas dos pagamentos", "Execução de contrato (V) e cumprimento de obrigação legal (II)"],
                ["Mensagens e mídias do chat da comunidade", "Funcionamento do chat e moderação de denúncias", "Execução de contrato (V)"],
                ["Aceite dos Termos (data e versão) e preferências (idioma, acessibilidade)", "Registro do aceite e personalização", "Cumprimento de obrigação legal (II) e execução de contrato (V)"],
                ["Endereço IP (temporário, em memória) e cookie de sessão", "Manter você conectado e limitar tentativas de login e cadastro", "Legítimo interesse na segurança (IX)"],
              ].map(([data, purpose, basis]) => (
                <tr key={data} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-800">{data}</td>
                  <td className="py-2 pr-3">{purpose}</td>
                  <td className="py-2">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Não vendemos seus dados, não usamos para publicidade e não fazemos decisões automatizadas sobre você: toda comprovação
          é analisada por uma pessoa da moderação. A localização é lida apenas quando você envia uma comprovação, não em segundo plano.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Quem vê seus dados">
        <LegalList
          items={[
            "Outros usuários veem seu nome, pontos e nível no ranking, e suas mensagens no chat.",
            "Moderadores e administradores veem as comprovações (foto, relato e localização) para analisá-las, e administradores veem a carteira para fazer os pagamentos.",
            "Operadores que nos ajudam a funcionar, sob contrato: hospedagem do app, banco de dados e armazenamento de arquivos (por exemplo, Vercel e Supabase) e envio de e-mails (por exemplo, Resend). Alguns desses serviços ficam fora do Brasil; nesses casos, a transferência segue as garantias da LGPD (art. 33).",
            "Autoridades, quando a lei ou uma ordem judicial exigir.",
          ]}
        />
      </LegalSection>

      <LegalSection n={3} title="Blockchain: o que é público e permanente">
        <p>
          Pagamentos em FONE e a transferência de verificação da carteira ficam registrados na blockchain da Fone Protocol, que é
          <b> pública</b>: qualquer pessoa pode ver o endereço, o valor e a data no explorador da rede. Esses registros{" "}
          <b>não podem ser apagados</b> por ninguém, nem mesmo se você excluir sua conta. O EcoVerify não publica seu nome ou
          e-mail na blockchain.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Crianças e adolescentes">
        <p>
          O EcoVerify não é destinado a menores de {MIN_AGE} anos. Adolescentes de {MIN_AGE} a 17 anos só podem usar com
          autorização do responsável legal e não recebem FONE. Tratamos os dados deles no seu melhor interesse (LGPD, art. 14) e
          apenas no necessário para participar das missões. Se você é responsável e quer pedir a exclusão da conta de um menor,
          fale conosco.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Por quanto tempo guardamos">
        <LegalList
          items={[
            "Enquanto sua conta existir.",
            "Ao excluir a conta, apagamos nome, e-mail, senha, fotos, relatos, localização, mensagens, carteira, notificações e sessões. Mantemos, sem identificação, o necessário para cumprir obrigações e evitar fraudes (LGPD, art. 16): o registro de comprovações já analisadas (sem foto, relato ou localização), o hash das fotos, o histórico de pontos e os pagamentos já feitos.",
            "Links de confirmação de e-mail valem 48 horas e de redefinição de senha, 1 hora.",
          ]}
        />
      </LegalSection>

      <LegalSection n={6} title="Seus direitos (LGPD, art. 18)">
        <LegalList
          items={[
            <><b>Acesso e portabilidade:</b> baixe seus dados em Configurações → Privacidade e dados.</>,
            <><b>Correção:</b> altere nome e preferências no app ou fale conosco.</>,
            <><b>Eliminação:</b> exclua sua conta em Configurações → Privacidade e dados.</>,
            "Informação sobre compartilhamento, oposição a tratamentos baseados em legítimo interesse e revisão de decisões: fale conosco.",
            "Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).",
          ]}
        />
      </LegalSection>

      <LegalSection n={7} title="Segurança">
        <p>
          Senhas guardadas com hash (bcrypt), conexão criptografada, arquivos em armazenamento privado acessível só a usuários
          logados, limite de tentativas de login e registro de quem aprova e paga. Se houver um incidente que possa trazer risco a
          você, avisaremos você e a ANPD.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Cookies">
        <p>Usamos apenas um cookie essencial, que mantém você conectado. Não usamos cookies de publicidade nem de rastreamento.</p>
      </LegalSection>

      <LegalSection n={9} title="Alterações">
        <p>Quando esta Política mudar de forma relevante, avisaremos no app e pediremos que você aceite a nova versão.</p>
      </LegalSection>
    </div>
  );
}
