/**
 * Copy of the public site (landing, plans, organizations). Shared by the web app and the demo.
 */
import type { Lang } from "@/lib/i18n";
import type { PlanFeature, PlanId } from "@/lib/plans";

interface Step {
  title: string;
  body: string;
}
interface Audience {
  id: "school" | "business" | "government" | "ngo";
  title: string;
  body: string;
  bullets: string[];
}
interface Faq {
  q: string;
  a: string;
}

export interface MarketingText {
  nav: { how: string; orgs: string; pricing: string; transparency: string; login: string; demo: string; start: string; panel: string };
  hero: { badge: string; title: string; titleAccent: string; subtitle: string; ctaStart: string; ctaDemo: string; note: string };
  floating: { verified: string; points: string; fone: string };
  stats: { actions: string; people: string; cities: string; fone: string };
  /** Shown instead of the live numbers while the pilot is small. */
  facts: { value: string; label: string }[];
  everythingIn: (plan: string) => string;
  howTitle: string;
  howSubtitle: string;
  steps: Step[];
  orgsTitle: string;
  orgsSubtitle: string;
  audiences: Audience[];
  trustTitle: string;
  trust: Step[];
  pricingTitle: string;
  pricingSubtitle: string;
  monthly: string;
  yearly: string;
  yearlyBadge: string;
  perMonth: string;
  perYear: string;
  free: string;
  custom: string;
  customFrom: string;
  members: (n: number | null) => string;
  missions: (n: number | null) => string;
  planNames: Record<PlanId, string>;
  planTaglines: Record<PlanId, string>;
  planCta: Record<PlanId, string>;
  popular: string;
  featureNames: Record<PlanFeature, string>;
  citizensFree: string;
  campaignTitle: string;
  campaignBody: (fee: number) => string;
  campaignCta: string;
  trialNote: (days: number) => string;
  faqTitle: string;
  faq: Faq[];
  contactTitle: string;
  contactSubtitle: string;
  contactName: string;
  contactEmail: string;
  contactOrg: string;
  contactType: string;
  contactTypes: Record<"school" | "business" | "government" | "ngo" | "brand" | "other", string>;
  contactPlan: string;
  contactMessage: string;
  contactSend: string;
  contactSent: string;
  contactWhatsapp: string;
  contactError: string;
  footerTagline: string;
  footerProduct: string;
  footerLegal: string;
  footerIndependent: string;
}

const pt: MarketingText = {
  nav: { how: "Como funciona", orgs: "Para organizações", pricing: "Planos", transparency: "Transparência", login: "Entrar", demo: "Ver demo", start: "Começar grátis", panel: "Abrir o app" },
  hero: {
    badge: "Recompensas na blockchain Fone Protocol",
    title: "Ações ambientais reais,",
    titleAccent: "verificadas e recompensadas.",
    subtitle:
      "Missões com foto e GPS, verificação por IA e moderação humana, ranking e recompensas em FONE. Para cidadãos, escolas, empresas e prefeituras.",
    ctaStart: "Criar minha organização",
    ctaDemo: "Ver demo de 3 minutos",
    note: "Grátis para cidadãos · Plano grátis para organizações",
  },
  floating: { verified: "Verificado pela IA", points: "+50 pontos", fone: "20 FONE enviados" },
  stats: { actions: "ações verificadas", people: "pessoas participando", cities: "cidades", fone: "FONE pagos" },
  facts: [
    { value: "5.570", label: "municípios com missões por região" },
    { value: "3", label: "idiomas: português, inglês e espanhol" },
    { value: "Web + Android", label: "funciona no navegador e no celular" },
    { value: "LGPD", label: "privacidade desde o primeiro dia" },
  ],
  everythingIn: (plan) => `Tudo do ${plan}, e:`,
  howTitle: "Como funciona",
  howSubtitle: "Do mutirão na praia ao FONE na carteira, com prova em cada etapa.",
  steps: [
    { title: "Escolha uma missão", body: "Missões perto de você ou feitas de casa: coleta seletiva, limpeza de praia, plantio, descarte de óleo." },
    { title: "Comprove no local", body: "Foto tirada na hora, com GPS conferido no raio da missão. Sem foto repetida, sem print de tela." },
    { title: "IA + moderação", body: "A IA aprova os casos claros e sugere nos outros. Sempre há revisão humana e direito de contestar." },
    { title: "Ganhe pontos e FONE", body: "Pontos e ranking para todos. Maiores de 18 recebem FONE numa carteira verificada." },
  ],
  orgsTitle: "Um espaço próprio para a sua organização",
  orgsSubtitle: "Missões só para o seu grupo, ranking interno, painel de impacto e relatórios prontos para apresentar.",
  audiences: [
    {
      id: "school",
      title: "Escolas",
      body: "Educação ambiental na prática, com engajamento dos alunos.",
      bullets: ["Missões por turma e ranking da escola", "Certificado de participação para os alunos", "Relatório para projetos e feiras"],
    },
    {
      id: "business",
      title: "Empresas e ESG",
      body: "Voluntariado corporativo com prova de impacto.",
      bullets: ["Campanhas para colaboradores", "Relatório ESG com evidências", "Recompensas em FONE bancadas pela empresa"],
    },
    {
      id: "government",
      title: "Prefeituras",
      body: "Cidadania ativa e dados para decidir onde agir.",
      bullets: ["Missões públicas na cidade", "Mapa de demanda por bairro", "Página pública de impacto"],
    },
    {
      id: "ngo",
      title: "ONGs e marcas",
      body: "Mobilize voluntários ou patrocine missões com a sua marca.",
      bullets: ["Plano grátis para começar", "Missões patrocinadas com orçamento próprio", "Transparência pública dos pagamentos"],
    },
  ],
  trustTitle: "Feito para ser confiável",
  trust: [
    { title: "Antifraude em camadas", body: "GPS, foto na hora, hash da imagem, IA, moderação e limites de pagamento." },
    { title: "Transparência pública", body: "Impacto, pagamentos e patrocínios abertos em uma página pública, sem expor ninguém." },
    { title: "LGPD de verdade", body: "Dados mínimos, exportação e exclusão de conta, menores sem recompensa financeira." },
    { title: "Na blockchain Fone", body: "Recompensas em FONE com taxa baixa, registradas e conferíveis no explorador." },
  ],
  pricingTitle: "Planos para organizações",
  pricingSubtitle: "Cidadãos usam de graça, sempre. Organizações começam no plano grátis e mudam quando quiserem.",
  monthly: "Mensal",
  yearly: "Anual",
  yearlyBadge: "2 meses grátis",
  perMonth: "/mês",
  perYear: "/ano",
  free: "Grátis",
  custom: "Sob consulta",
  customFrom: "Projetos a partir de R$ 990/mês",
  members: (n) => (n === null ? "Participantes ilimitados" : `Até ${n.toLocaleString("pt-BR")} participantes`),
  missions: (n) => (n === null ? "Missões ilimitadas" : `${n} missões ativas`),
  planNames: { free: "Comunidade", school: "Escola", business: "Empresa", government: "Prefeitura" },
  planTaglines: {
    free: "Para grupos, coletivos e ONGs começarem.",
    school: "Para escolas e cursos engajarem turmas.",
    business: "Para programas de ESG e voluntariado.",
    government: "Para cidades inteiras participarem.",
  },
  planCta: { free: "Começar grátis", school: "Testar 14 dias", business: "Testar 14 dias", government: "Falar com a equipe" },
  popular: "Mais escolhido",
  featureNames: {
    ranking: "Ranking interno",
    public_page: "Página pública de impacto",
    reports: "Relatório de impacto (PDF)",
    certificates: "Certificados com QR code",
    team_moderation: "Moderação pela sua equipe",
    branding: "Logo e cor da organização",
    csv_export: "Exportação de dados (CSV)",
    sponsored_fone: "Recompensas em FONE próprias",
    city_demand: "Mapa de demanda por bairro",
    priority_support: "Suporte prioritário",
  },
  citizensFree: "Cidadãos: sempre grátis, com pontos, ranking e FONE para maiores de 18.",
  campaignTitle: "Campanhas de marca",
  campaignBody: (fee) =>
    `Sua marca patrocina missões abertas ao público com um orçamento em FONE. Você vê cada ação comprovada e paga uma taxa de serviço de ${fee}% sobre o orçamento.`,
  campaignCta: "Quero patrocinar",
  trialNote: (days) => `${days} dias grátis nos planos pagos, sem cartão. Pagamento por Pix.`,
  faqTitle: "Perguntas frequentes",
  faq: [
    { q: "Cidadãos pagam alguma coisa?", a: "Não. Participar das missões, ganhar pontos e receber FONE (maiores de 18) é grátis." },
    { q: "O FONE vale dinheiro?", a: "O FONE é o token da rede Fone Protocol. O EcoVerify não promete conversão em reais nem valorização; as recompensas seguem regras públicas de pagamento." },
    { q: "Como a organização paga?", a: "Por Pix, mensal ou anual. Os planos pagos têm 14 dias grátis e você pode voltar ao plano grátis quando quiser." },
    { q: "Menores de idade podem participar?", a: "Sim, com pontos, ranking e certificados. Recompensas em FONE são só para maiores de 18." },
    { q: "E se alguém tentar fraudar?", a: "Foto na hora, GPS, hash da imagem, IA, moderação, carência e limites de pagamento reduzem muito o risco, e tudo fica registrado." },
  ],
  contactTitle: "Vamos conversar",
  contactSubtitle: "Conte sobre a sua escola, empresa ou cidade. Respondemos em até 2 dias úteis.",
  contactName: "Seu nome",
  contactEmail: "E-mail",
  contactOrg: "Organização",
  contactType: "Tipo",
  contactTypes: { school: "Escola", business: "Empresa", government: "Prefeitura / governo", ngo: "ONG / coletivo", brand: "Marca (patrocínio)", other: "Outro" },
  contactPlan: "Plano de interesse",
  contactMessage: "Mensagem (opcional)",
  contactSend: "Enviar",
  contactSent: "Recebemos sua mensagem! Entraremos em contato em breve.",
  contactWhatsapp: "Prefere WhatsApp?",
  contactError: "Não foi possível enviar. Confira os campos e tente de novo.",
  footerTagline: "Ações ambientais verificadas e recompensadas.",
  footerProduct: "Produto",
  footerLegal: "Legal",
  footerIndependent: "Projeto independente construído sobre a rede Fone Protocol.",
};

const en: MarketingText = {
  nav: { how: "How it works", orgs: "For organizations", pricing: "Pricing", transparency: "Transparency", login: "Sign in", demo: "See demo", start: "Start free", panel: "Open the app" },
  hero: {
    badge: "Rewards on the Fone Protocol blockchain",
    title: "Real environmental actions,",
    titleAccent: "verified and rewarded.",
    subtitle:
      "Missions with photo and GPS proof, AI checks and human moderation, rankings and FONE rewards. For citizens, schools, companies and city halls.",
    ctaStart: "Create my organization",
    ctaDemo: "Watch the 3-minute demo",
    note: "Free for citizens · Free plan for organizations",
  },
  floating: { verified: "Verified by AI", points: "+50 points", fone: "20 FONE sent" },
  stats: { actions: "verified actions", people: "people taking part", cities: "cities", fone: "FONE paid" },
  facts: [
    { value: "5,570", label: "Brazilian cities with regional missions" },
    { value: "3", label: "languages: Portuguese, English, Spanish" },
    { value: "Web + Android", label: "works in the browser and on phones" },
    { value: "LGPD", label: "privacy from day one" },
  ],
  everythingIn: (plan) => `Everything in ${plan}, plus:`,
  howTitle: "How it works",
  howSubtitle: "From the beach clean-up to FONE in the wallet, with proof at every step.",
  steps: [
    { title: "Pick a mission", body: "Missions near you or done from home: recycling, beach clean-ups, tree planting, cooking-oil disposal." },
    { title: "Prove it on site", body: "A photo taken on the spot, with GPS checked against the mission radius. No reused photos, no screenshots." },
    { title: "AI + moderation", body: "AI approves clear cases and suggests on the rest. There is always human review and a right to appeal." },
    { title: "Earn points and FONE", body: "Points and rankings for everyone. Adults receive FONE in a verified wallet." },
  ],
  orgsTitle: "A space of your own for your organization",
  orgsSubtitle: "Missions only for your group, an internal ranking, an impact dashboard and ready-to-present reports.",
  audiences: [
    {
      id: "school",
      title: "Schools",
      body: "Hands-on environmental education that students love.",
      bullets: ["Class missions and a school ranking", "Participation certificates for students", "Reports for projects and science fairs"],
    },
    {
      id: "business",
      title: "Companies & ESG",
      body: "Corporate volunteering with proof of impact.",
      bullets: ["Campaigns for employees", "ESG report with evidence", "FONE rewards funded by the company"],
    },
    {
      id: "government",
      title: "City halls",
      body: "Active citizenship and data to decide where to act.",
      bullets: ["Public missions across the city", "Demand map by neighbourhood", "Public impact page"],
    },
    {
      id: "ngo",
      title: "NGOs & brands",
      body: "Mobilise volunteers or sponsor missions with your brand.",
      bullets: ["Free plan to get started", "Sponsored missions with their own budget", "Public transparency of payments"],
    },
  ],
  trustTitle: "Built to be trusted",
  trust: [
    { title: "Layered anti-fraud", body: "GPS, live photos, image hashing, AI, moderation and payout limits." },
    { title: "Public transparency", body: "Impact, payments and sponsorships on a public page, without exposing anyone." },
    { title: "Privacy by design", body: "Minimal data, account export and deletion, no financial rewards for minors." },
    { title: "On the Fone blockchain", body: "Low-fee FONE rewards, recorded and verifiable on the explorer." },
  ],
  pricingTitle: "Plans for organizations",
  pricingSubtitle: "Citizens always use it for free. Organizations start on the free plan and upgrade whenever they want.",
  monthly: "Monthly",
  yearly: "Yearly",
  yearlyBadge: "2 months free",
  perMonth: "/mo",
  perYear: "/yr",
  free: "Free",
  custom: "Custom",
  customFrom: "Projects from R$ 990/month",
  members: (n) => (n === null ? "Unlimited participants" : `Up to ${n.toLocaleString("en-US")} participants`),
  missions: (n) => (n === null ? "Unlimited missions" : `${n} active missions`),
  planNames: { free: "Community", school: "School", business: "Business", government: "City hall" },
  planTaglines: {
    free: "For groups, collectives and NGOs getting started.",
    school: "For schools and courses engaging their classes.",
    business: "For ESG and volunteering programs.",
    government: "For whole cities to take part.",
  },
  planCta: { free: "Start free", school: "Try 14 days", business: "Try 14 days", government: "Talk to us" },
  popular: "Most popular",
  featureNames: {
    ranking: "Internal ranking",
    public_page: "Public impact page",
    reports: "Impact report (PDF)",
    certificates: "Certificates with QR code",
    team_moderation: "Moderation by your team",
    branding: "Your logo and colour",
    csv_export: "Data export (CSV)",
    sponsored_fone: "Your own FONE rewards",
    city_demand: "Neighbourhood demand map",
    priority_support: "Priority support",
  },
  citizensFree: "Citizens: always free, with points, rankings and FONE for adults.",
  campaignTitle: "Brand campaigns",
  campaignBody: (fee) =>
    `Your brand sponsors public missions with a FONE budget. You see every proven action and pay a ${fee}% service fee on top of the budget.`,
  campaignCta: "I want to sponsor",
  trialNote: (days) => `${days}-day free trial on paid plans, no card needed. Payment via Pix.`,
  faqTitle: "FAQ",
  faq: [
    { q: "Do citizens pay anything?", a: "No. Joining missions, earning points and receiving FONE (adults) is free." },
    { q: "Is FONE worth money?", a: "FONE is the token of the Fone Protocol network. EcoVerify does not promise conversion to fiat or appreciation; rewards follow public payout rules." },
    { q: "How does an organization pay?", a: "Via Pix, monthly or yearly. Paid plans include 14 free days and you can go back to the free plan at any time." },
    { q: "Can minors take part?", a: "Yes, with points, rankings and certificates. FONE rewards are for adults only." },
    { q: "What about fraud?", a: "Live photos, GPS, image hashing, AI, moderation, holding periods and payout limits greatly reduce the risk, and everything is logged." },
  ],
  contactTitle: "Let's talk",
  contactSubtitle: "Tell us about your school, company or city. We reply within 2 business days.",
  contactName: "Your name",
  contactEmail: "Email",
  contactOrg: "Organization",
  contactType: "Type",
  contactTypes: { school: "School", business: "Company", government: "City hall / government", ngo: "NGO / collective", brand: "Brand (sponsorship)", other: "Other" },
  contactPlan: "Plan of interest",
  contactMessage: "Message (optional)",
  contactSend: "Send",
  contactSent: "Message received! We'll be in touch soon.",
  contactWhatsapp: "Prefer WhatsApp?",
  contactError: "Couldn't send. Check the fields and try again.",
  footerTagline: "Verified and rewarded environmental actions.",
  footerProduct: "Product",
  footerLegal: "Legal",
  footerIndependent: "Independent project built on the Fone Protocol network.",
};

const es: MarketingText = {
  nav: { how: "Cómo funciona", orgs: "Para organizaciones", pricing: "Planes", transparency: "Transparencia", login: "Entrar", demo: "Ver demo", start: "Empezar gratis", panel: "Abrir la app" },
  hero: {
    badge: "Recompensas en la blockchain Fone Protocol",
    title: "Acciones ambientales reales,",
    titleAccent: "verificadas y recompensadas.",
    subtitle:
      "Misiones con foto y GPS, verificación por IA y moderación humana, ranking y recompensas en FONE. Para ciudadanos, escuelas, empresas y municipios.",
    ctaStart: "Crear mi organización",
    ctaDemo: "Ver demo de 3 minutos",
    note: "Gratis para ciudadanos · Plan gratis para organizaciones",
  },
  floating: { verified: "Verificado por la IA", points: "+50 puntos", fone: "20 FONE enviados" },
  stats: { actions: "acciones verificadas", people: "personas participando", cities: "ciudades", fone: "FONE pagados" },
  facts: [
    { value: "5.570", label: "municipios de Brasil con misiones regionales" },
    { value: "3", label: "idiomas: portugués, inglés y español" },
    { value: "Web + Android", label: "funciona en el navegador y en el móvil" },
    { value: "LGPD", label: "privacidad desde el primer día" },
  ],
  everythingIn: (plan) => `Todo lo de ${plan}, y:`,
  howTitle: "Cómo funciona",
  howSubtitle: "De la limpieza de playa al FONE en la billetera, con prueba en cada paso.",
  steps: [
    { title: "Elige una misión", body: "Misiones cerca de ti o desde casa: reciclaje, limpieza de playas, plantación, aceite usado." },
    { title: "Compruébalo en el lugar", body: "Foto tomada en el momento, con GPS dentro del radio de la misión. Sin fotos repetidas ni capturas." },
    { title: "IA + moderación", body: "La IA aprueba los casos claros y sugiere en los demás. Siempre hay revisión humana y derecho a apelar." },
    { title: "Gana puntos y FONE", body: "Puntos y ranking para todos. Los mayores de 18 reciben FONE en una billetera verificada." },
  ],
  orgsTitle: "Un espacio propio para tu organización",
  orgsSubtitle: "Misiones solo para tu grupo, ranking interno, panel de impacto e informes listos para presentar.",
  audiences: [
    {
      id: "school",
      title: "Escuelas",
      body: "Educación ambiental práctica, con alumnos comprometidos.",
      bullets: ["Misiones por curso y ranking escolar", "Certificado de participación", "Informe para proyectos y ferias"],
    },
    {
      id: "business",
      title: "Empresas y ESG",
      body: "Voluntariado corporativo con prueba de impacto.",
      bullets: ["Campañas para colaboradores", "Informe ESG con evidencias", "Recompensas en FONE pagadas por la empresa"],
    },
    {
      id: "government",
      title: "Municipios",
      body: "Ciudadanía activa y datos para decidir dónde actuar.",
      bullets: ["Misiones públicas en la ciudad", "Mapa de demanda por barrio", "Página pública de impacto"],
    },
    {
      id: "ngo",
      title: "ONG y marcas",
      body: "Moviliza voluntarios o patrocina misiones con tu marca.",
      bullets: ["Plan gratis para empezar", "Misiones patrocinadas con presupuesto propio", "Transparencia pública de los pagos"],
    },
  ],
  trustTitle: "Hecho para ser confiable",
  trust: [
    { title: "Antifraude en capas", body: "GPS, foto en el momento, hash de imagen, IA, moderación y límites de pago." },
    { title: "Transparencia pública", body: "Impacto, pagos y patrocinios en una página pública, sin exponer a nadie." },
    { title: "Privacidad real", body: "Datos mínimos, exportación y eliminación de cuenta, sin recompensa financiera a menores." },
    { title: "En la blockchain Fone", body: "Recompensas en FONE con comisión baja, registradas y verificables en el explorador." },
  ],
  pricingTitle: "Planes para organizaciones",
  pricingSubtitle: "Los ciudadanos lo usan gratis, siempre. Las organizaciones empiezan gratis y cambian cuando quieran.",
  monthly: "Mensual",
  yearly: "Anual",
  yearlyBadge: "2 meses gratis",
  perMonth: "/mes",
  perYear: "/año",
  free: "Gratis",
  custom: "A consultar",
  customFrom: "Proyectos desde R$ 990/mes",
  members: (n) => (n === null ? "Participantes ilimitados" : `Hasta ${n.toLocaleString("es-ES")} participantes`),
  missions: (n) => (n === null ? "Misiones ilimitadas" : `${n} misiones activas`),
  planNames: { free: "Comunidad", school: "Escuela", business: "Empresa", government: "Municipio" },
  planTaglines: {
    free: "Para grupos, colectivos y ONG que empiezan.",
    school: "Para escuelas y cursos que quieren motivar a sus alumnos.",
    business: "Para programas de ESG y voluntariado.",
    government: "Para que participe toda la ciudad.",
  },
  planCta: { free: "Empezar gratis", school: "Probar 14 días", business: "Probar 14 días", government: "Hablar con el equipo" },
  popular: "Más elegido",
  featureNames: {
    ranking: "Ranking interno",
    public_page: "Página pública de impacto",
    reports: "Informe de impacto (PDF)",
    certificates: "Certificados con código QR",
    team_moderation: "Moderación por tu equipo",
    branding: "Logo y color propios",
    csv_export: "Exportación de datos (CSV)",
    sponsored_fone: "Recompensas en FONE propias",
    city_demand: "Mapa de demanda por barrio",
    priority_support: "Soporte prioritario",
  },
  citizensFree: "Ciudadanos: siempre gratis, con puntos, ranking y FONE para mayores de 18.",
  campaignTitle: "Campañas de marca",
  campaignBody: (fee) =>
    `Tu marca patrocina misiones abiertas al público con un presupuesto en FONE. Ves cada acción comprobada y pagas una comisión de servicio del ${fee}% sobre el presupuesto.`,
  campaignCta: "Quiero patrocinar",
  trialNote: (days) => `${days} días gratis en los planes de pago, sin tarjeta. Pago por Pix.`,
  faqTitle: "Preguntas frecuentes",
  faq: [
    { q: "¿Los ciudadanos pagan algo?", a: "No. Participar, ganar puntos y recibir FONE (mayores de 18) es gratis." },
    { q: "¿El FONE vale dinero?", a: "FONE es el token de la red Fone Protocol. EcoVerify no promete conversión a dinero ni valorización; las recompensas siguen reglas públicas de pago." },
    { q: "¿Cómo paga la organización?", a: "Por Pix, mensual o anual. Los planes de pago tienen 14 días gratis y puedes volver al plan gratis cuando quieras." },
    { q: "¿Pueden participar menores?", a: "Sí, con puntos, ranking y certificados. Las recompensas en FONE son solo para mayores de 18." },
    { q: "¿Y el fraude?", a: "Foto en el momento, GPS, hash de imagen, IA, moderación, carencia y límites de pago reducen mucho el riesgo, y todo queda registrado." },
  ],
  contactTitle: "Hablemos",
  contactSubtitle: "Cuéntanos sobre tu escuela, empresa o ciudad. Respondemos en hasta 2 días hábiles.",
  contactName: "Tu nombre",
  contactEmail: "Correo",
  contactOrg: "Organización",
  contactType: "Tipo",
  contactTypes: { school: "Escuela", business: "Empresa", government: "Municipio / gobierno", ngo: "ONG / colectivo", brand: "Marca (patrocinio)", other: "Otro" },
  contactPlan: "Plan de interés",
  contactMessage: "Mensaje (opcional)",
  contactSend: "Enviar",
  contactSent: "¡Mensaje recibido! Te contactaremos pronto.",
  contactWhatsapp: "¿Prefieres WhatsApp?",
  contactError: "No se pudo enviar. Revisa los campos e inténtalo de nuevo.",
  footerTagline: "Acciones ambientales verificadas y recompensadas.",
  footerProduct: "Producto",
  footerLegal: "Legal",
  footerIndependent: "Proyecto independiente construido sobre la red Fone Protocol.",
};

export const MARKETING_TEXT: Record<Lang, MarketingText> = { pt, en, es };

export const LEAD_TYPES = ["school", "business", "government", "ngo", "brand", "other"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];
