import { MIN_AGE, type LegalInfo } from "@/lib/legal";
import type { Lang } from "@/lib/i18n";
import { LegalList, LegalSection, contactText } from "./legal-ui";
import { PrivacyEn } from "./privacy-en";
import { PrivacyEs } from "./privacy-es";

/**
 * Política de Privacidade do EcoVerify, alinhada à LGPD (Lei 13.709/2018).
 * Texto-base escrito a partir dos fluxos reais de dados do app: revisar com advogado.
 * Esta é a versão que vale; privacy-en.tsx e privacy-es.tsx são traduções (atualize-as junto).
 */
export function PrivacyContent({ info, lang = "pt" }: { info: LegalInfo; lang?: Lang }) {
  if (lang === "en") return <PrivacyEn info={info} />;
  if (lang === "es") return <PrivacyEs info={info} />;
  return <PrivacyPt info={info} />;
}

function PrivacyPt({ info }: { info: LegalInfo }) {
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
                ["Impressão digital (hash) das fotos, inclusive uma versão que reconhece fotos quase iguais", "Impedir que a mesma foto seja reutilizada", "Legítimo interesse na prevenção de fraude (IX)"],
                ["Resultado da verificação automática (veredito, confiança, motivo e observações)", "Ajudar a moderação e decidir casos claros", "Execução de contrato (V) e legítimo interesse na prevenção de fraude (IX)"],
                ["Contestação de uma decisão automática", "Revisão por uma pessoa (LGPD, art. 20)", "Exercício regular de direitos (VI)"],
                ["Cartões (amarelo/vermelho), motivo, explicação da equipe, suspensões, bloqueios e as suas contestações", "Prevenir fraude, aplicar as regras dos Termos (item 8) e permitir a sua defesa", "Legítimo interesse na prevenção de fraude (IX) e exercício regular de direitos (VI)"],
                ["Endereço da carteira FONE, transação de verificação e declaração de 18 anos", "Provar que a carteira é sua e pagar recompensas só a maiores", "Execução de contrato (V)"],
                ["Pontos, recompensas e pagamentos", "Ranking, histórico e prestação de contas dos pagamentos", "Execução de contrato (V) e cumprimento de obrigação legal (II)"],
                ["Pedidos de “Quero mais missões aqui” (só a cidade) e sugestões de missão (texto e o ponto escolhido)", "Saber onde faltam missões e criar ações propostas pela comunidade", "Legítimo interesse (IX) e execução de contrato (V)"],
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
          Não vendemos seus dados e não usamos para publicidade. A localização é lida apenas quando você envia uma comprovação,
          sugere uma missão ou pede para ver missões perto de você, nunca em segundo plano. Para mostrar missões perto de você,
          a cidade e coordenadas arredondadas (cerca de 1 km) ficam só num cookie do seu aparelho, não no nosso banco de dados; o
          nome da cidade é descoberto dentro do próprio app, sem enviar sua posição a outros serviços. Antes de guardar a foto, removemos os metadados do arquivo (EXIF), como modelo do aparelho e
          coordenadas embutidas.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Verificação automática das comprovações">
        <LegalList
          items={[
            "Cada comprovação passa por regras automáticas (distância até a missão, precisão do GPS, foto repetida) e, quando ligada, por um modelo de inteligência artificial que descreve a foto e diz se ela combina com a missão.",
            <>Para isso enviamos ao serviço <b>Google Gemini</b> (Google LLC, EUA) apenas uma cópia <b>reduzida da foto, sem metadados</b>, o título e as instruções da missão e o seu relato. <b>Não enviamos</b> nome, e-mail, localização nem qualquer identificador da sua conta.</>,
            "Na fase de testes usamos o plano gratuito do Gemini. Nesse plano o Google pode usar o conteúdo enviado para melhorar seus produtos e ele pode ser lido por revisores humanos. Por isso pedimos que o relato não traga dados pessoais e que você evite fotografar rostos de outras pessoas.",
            <>Quando a <b>busca reversa de imagens</b> estiver ligada, a mesma cópia reduzida e sem metadados (só a imagem, sem relato e sem dados da conta) é enviada ao <b>Google Cloud Vision</b> (Google LLC, EUA, serviço pago, que não usa o conteúdo para treinar modelos) para procurar a foto na internet. Se ela for encontrada, os links vão para a equipe, que confere antes de decidir: isso nunca rejeita a foto sozinho nem gera cartão.</>,
            "Casos claros podem ser aprovados ou rejeitados automaticamente (decisão automatizada). Toda rejeição informa o motivo, missões de valor mais alto sempre passam por uma pessoa e, se o serviço estiver indisponível, a comprovação vai para a moderação.",
            <><b>Revisão (LGPD, art. 20):</b> você pode contestar qualquer rejeição automática em Meus envios, e uma pessoa da moderação analisa de novo. Você também pode pedir informações sobre os critérios usados.</>,
          ]}
        />
      </LegalSection>

      <LegalSection n={3} title="Quem vê seus dados">
        <LegalList
          items={[
            "Outros usuários veem seu nome, pontos e nível no ranking. Suas mensagens no chat da Comunidade são vistas pelos membros da organização onde você escreveu.",
            "Moderadores e administradores veem as comprovações (foto, relato e localização) para analisá-las, e administradores veem a carteira para fazer os pagamentos.",
            "Operadores que nos ajudam a funcionar, sob contrato: hospedagem do app, banco de dados e armazenamento de arquivos (por exemplo, Vercel e Supabase), envio de e-mails (por exemplo, Resend) e verificação automática das fotos (Google Gemini e, quando ligado, Google Cloud Vision; ver seção 2). Alguns desses serviços ficam fora do Brasil; nesses casos, a transferência segue as garantias da LGPD (art. 33).",
            "Para abastecer regiões sem missões, o servidor consulta o OpenStreetMap (mapa aberto e colaborativo) em busca de praias, parques e pontos de coleta perto do centro da cidade. Nessa consulta vai só a posição do centro do município, nunca a sua posição nem dados da sua conta.",
            "Autoridades, quando a lei ou uma ordem judicial exigir.",
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="Blockchain: o que é público e permanente">
        <p>
          Pagamentos em FONE e a transferência de verificação da carteira ficam registrados na blockchain da Fone Protocol, que é
          <b> pública</b>: qualquer pessoa pode ver o endereço, o valor e a data no explorador da rede. Esses registros{" "}
          <b>não podem ser apagados</b> por ninguém, nem mesmo se você excluir sua conta. O EcoVerify não publica seu nome ou
          e-mail na blockchain.
        </p>
        <p className="mt-2">
          Na página pública de <b>Transparência</b> mostramos
          totais do app e os últimos pagamentos (data, valor, endereço abreviado e link da transação), <b>sem nome, e-mail ou foto</b>.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Crianças e adolescentes">
        <p>
          O EcoVerify não é destinado a menores de {MIN_AGE} anos. Adolescentes de {MIN_AGE} a 17 anos só podem usar com
          autorização do responsável legal e não recebem FONE. Tratamos os dados deles no seu melhor interesse (LGPD, art. 14) e
          apenas no necessário para participar das missões. Se você é responsável e quer pedir a exclusão da conta de um menor,
          fale conosco.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Por quanto tempo guardamos">
        <LegalList
          items={[
            "Enquanto sua conta existir.",
            "Ao excluir a conta, apagamos nome, e-mail, senha, fotos, relatos, localização, mensagens, carteira, notificações e sessões. Mantemos, sem identificação, o necessário para cumprir obrigações e evitar fraudes (LGPD, art. 16): o registro de comprovações já analisadas (sem foto, relato, localização ou observações da verificação automática), o hash das fotos, o histórico de pontos e os pagamentos já feitos.",
            "Links de confirmação de e-mail valem 48 horas e de redefinição de senha, 1 hora.",
          ]}
        />
      </LegalSection>

      <LegalSection n={7} title="Seus direitos (LGPD, art. 18)">
        <LegalList
          items={[
            <><b>Acesso e portabilidade:</b> baixe seus dados em Configurações → Privacidade e dados.</>,
            <><b>Correção:</b> altere nome e preferências no app ou fale conosco.</>,
            <><b>Eliminação:</b> exclua sua conta em Configurações → Privacidade e dados.</>,
            <><b>Revisão de decisões automatizadas:</b> conteste em Meus envios (ver seção 2).</>,
            "Informação sobre compartilhamento e oposição a tratamentos baseados em legítimo interesse: fale conosco.",
            "Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).",
          ]}
        />
      </LegalSection>

      <LegalSection n={8} title="Segurança">
        <p>
          Senhas guardadas com hash (bcrypt), conexão criptografada, arquivos em armazenamento privado acessível só a usuários
          logados, limite de tentativas de login e registro de quem aprova e paga. Se houver um incidente que possa trazer risco a
          você, avisaremos você e a ANPD.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cookies">
        <p>
          Usamos apenas cookies essenciais: um que mantém você conectado e, se você escolher uma região na tela de missões, outro
          que guarda essa região (cidade, raio e coordenadas arredondadas) por até 180 dias. Você pode trocar ou apagar a região a
          qualquer momento em “Ver todas”. Não usamos cookies de publicidade nem de rastreamento.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Alterações">
        <p>Quando esta Política mudar de forma relevante, avisaremos no app e pediremos que você aceite a nova versão.</p>
      </LegalSection>
    </div>
  );
}
