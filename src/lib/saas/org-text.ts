/** Texts of the organization area (web app and demo). */
import type { Lang } from "@/lib/i18n";
import type { OrgRole, OrgType } from "@/lib/saas/org-rules";

export interface OrgText {
  navOrgs: string;
  myOrgs: string;
  myOrgsSubtitle: string;
  noOrgs: string;
  create: string;
  join: string;
  joinTitle: string;
  joinCodeLabel: string;
  joinCodePlaceholder: string;
  joinSubmit: string;
  joinConfirm: (org: string) => string;
  joinedAlready: string;
  newTitle: string;
  newSubtitle: string;
  name: string;
  type: string;
  types: Record<OrgType, string>;
  city: string;
  plan: string;
  cycle: string;
  createSubmit: string;
  trialInfo: (days: number) => string;
  trialUsedInfo: string;
  roles: Record<OrgRole, string>;
  tabs: { overview: string; missions: string; moderation: string; members: string; plan: string; report: string };
  statMembers: string;
  statActions: string;
  statPoints: string;
  statMissions: string;
  ranking: string;
  rankingEmpty: string;
  orgMissions: string;
  orgMissionsEmpty: string;
  sectionMine: string;
  privateBadge: string;
  newMission: string;
  missionTitle: string;
  missionDescription: string;
  missionCategory: string;
  missionPoints: string;
  missionScope: string;
  scopeAnywhere: string;
  scopeLocal: string;
  missionLat: string;
  missionLng: string;
  useMyLocation: string;
  missionCreate: string;
  missionCreated: string;
  activate: string;
  deactivate: string;
  active: string;
  inactive: string;
  pointsOnlyNote: string;
  moderationEmpty: string;
  moderationHint: string;
  inviteTitle: string;
  inviteHint: string;
  inviteCopy: string;
  inviteCopied: string;
  inviteRegenerate: string;
  memberSince: string;
  makeManager: string;
  makeMember: string;
  remove: string;
  leave: string;
  leaveConfirm: string;
  teamNeedsPlan: string;
  usage: (used: number, max: number | null) => string;
  missionUsage: (used: number, max: number | null) => string;
  settingsTitle: string;
  brandColor: string;
  brandNeedsPlan: string;
  save: string;
  saved: string;
  errors: Record<string, string>;
  // Plan & billing
  currentPlan: string;
  statusLabels: Record<"trialing" | "active" | "past_due" | "canceled", string>;
  trialEnds: (days: number) => string;
  periodEnds: (date: string) => string;
  expiredNote: string;
  upgradeTitle: string;
  choosePlan: string;
  payWithPix: string;
  generatePix: string;
  pixTitle: string;
  pixHowTo: string;
  pixCopy: string;
  pixCopied: string;
  pixReported: string;
  iPaid: string;
  pixNotConfigured: string;
  talkToUs: string;
  invoices: string;
  invoiceStatus: Record<"pending" | "paid" | "canceled", string>;
  noInvoices: string;
  cancelInvoice: string;
  downgradeNote: string;
  // Report & certificates
  reportTitle: string;
  reportSubtitle: (org: string) => string;
  reportPrint: string;
  reportPeriod: string;
  reportByCategory: string;
  reportTopMembers: string;
  reportTimeline: string;
  reportVerify: string;
  reportNeedsPlan: string;
  certificate: string;
  certificateTitle: string;
  certificateBody: (name: string, org: string, actions: number, points: number) => string;
  certificateVerify: string;
  certificateNeedsPlan: string;
  publicPage: string;
  publicTitle: (org: string) => string;
  publicSubtitle: string;
  publicJoinCta: string;
  upgradeCta: string;
  ownerOnly: string;
}

const pt: OrgText = {
  navOrgs: "Organizações",
  myOrgs: "Minhas organizações",
  myOrgsSubtitle: "Escolas, empresas, prefeituras e grupos dos quais você participa.",
  noOrgs: "Você ainda não participa de nenhuma organização.",
  create: "Criar organização",
  join: "Entrar com código",
  joinTitle: "Entrar em uma organização",
  joinCodeLabel: "Código de convite",
  joinCodePlaceholder: "Ex.: ABCD2345",
  joinSubmit: "Entrar",
  joinConfirm: (org) => `Você foi convidado para participar de ${org}.`,
  joinedAlready: "Você já participa desta organização.",
  newTitle: "Criar organização",
  newSubtitle: "Um espaço próprio com missões, ranking e relatórios. Leva menos de um minuto.",
  name: "Nome da organização",
  type: "Tipo",
  types: { school: "Escola", business: "Empresa", government: "Prefeitura / governo", ngo: "ONG / coletivo", other: "Outro" },
  city: "Cidade (opcional)",
  plan: "Plano",
  cycle: "Cobrança",
  createSubmit: "Criar organização",
  trialInfo: (days) => `Planos pagos começam com ${days} dias grátis, sem cartão. Depois, pague por Pix ou volte ao plano grátis.`,
  trialUsedInfo: "O período de teste já foi usado.",
  roles: { owner: "Responsável", manager: "Gestor", member: "Participante" },
  tabs: { overview: "Visão geral", missions: "Missões", moderation: "Moderação", members: "Participantes", plan: "Plano", report: "Relatório" },
  statMembers: "participantes",
  statActions: "ações aprovadas",
  statPoints: "pontos",
  statMissions: "missões ativas",
  ranking: "Ranking da organização",
  rankingEmpty: "O ranking aparece quando as primeiras ações forem aprovadas.",
  orgMissions: "Missões da organização",
  orgMissionsEmpty: "Nenhuma missão ainda.",
  sectionMine: "Da sua organização",
  privateBadge: "Só para participantes",
  newMission: "Nova missão",
  missionTitle: "Título",
  missionDescription: "Descrição (o que fazer e o que a foto deve mostrar)",
  missionCategory: "Categoria",
  missionPoints: "Pontos",
  missionScope: "Onde",
  scopeAnywhere: "Em qualquer lugar (ex.: em casa)",
  scopeLocal: "Em um local (confere o GPS)",
  missionLat: "Latitude",
  missionLng: "Longitude",
  useMyLocation: "Usar minha localização",
  missionCreate: "Criar missão",
  missionCreated: "Missão criada!",
  activate: "Ativar",
  deactivate: "Desativar",
  active: "Ativa",
  inactive: "Inativa",
  pointsOnlyNote: "Missões da organização dão pontos e contam no ranking. Recompensas em FONE próprias: plano Empresa (fale com a equipe).",
  moderationEmpty: "Nenhuma comprovação aguardando análise.",
  moderationHint: "Comprovações das missões da sua organização. A IA já aprova ou rejeita os casos claros.",
  inviteTitle: "Convide participantes",
  inviteHint: "Compartilhe o link ou o código. Quem entrar vê as missões da organização.",
  inviteCopy: "Copiar link",
  inviteCopied: "Link copiado!",
  inviteRegenerate: "Gerar novo código",
  memberSince: "desde",
  makeManager: "Tornar gestor",
  makeMember: "Tornar participante",
  remove: "Remover",
  leave: "Sair da organização",
  leaveConfirm: "Sair desta organização?",
  teamNeedsPlan: "Gestores além do responsável: planos Escola e Empresa.",
  usage: (used, max) => (max === null ? `${used} participantes` : `${used} de ${max} participantes`),
  missionUsage: (used, max) => (max === null ? `${used} missões ativas` : `${used} de ${max} missões ativas`),
  settingsTitle: "Dados da organização",
  brandColor: "Cor da organização",
  brandNeedsPlan: "Cor própria: plano Empresa.",
  save: "Salvar",
  saved: "Salvo!",
  errors: {
    invalid: "Confira os campos.",
    not_found: "Organização não encontrada.",
    invalid_code: "Código inválido.",
    member_limit: "A organização atingiu o limite de participantes do plano. Peça ao responsável para mudar de plano.",
    mission_limit: "Limite de missões ativas do plano atingido. Desative uma missão ou mude de plano.",
    forbidden: "Você não tem permissão para isso.",
    needs_plan: "Recurso disponível em um plano pago.",
    owner_cannot_leave: "O responsável não pode sair. Transfira a organização antes (fale com o suporte).",
    too_many: "Muitas tentativas. Tente de novo mais tarde.",
    pix_unavailable: "Pagamento por Pix ainda não configurado. Fale com a equipe.",
    open_invoice: "Já existe uma cobrança em aberto.",
  },
  currentPlan: "Plano atual",
  statusLabels: { trialing: "Teste grátis", active: "Ativo", past_due: "Pagamento pendente", canceled: "Cancelado" },
  trialEnds: (days) => (days <= 0 ? "O teste terminou." : `O teste termina em ${days} dia${days === 1 ? "" : "s"}.`),
  periodEnds: (date) => `Válido até ${date}.`,
  expiredNote: "O período terminou: a organização está usando os limites do plano grátis até o pagamento.",
  upgradeTitle: "Mudar ou renovar plano",
  choosePlan: "Escolha o plano",
  payWithPix: "Pagar com Pix",
  generatePix: "Gerar Pix",
  pixTitle: "Pague com Pix",
  pixHowTo: "Abra o app do seu banco, escolha Pix › Ler QR code (ou Pix copia e cola) e confirme o valor. O plano é liberado assim que o pagamento for confirmado.",
  pixCopy: "Copiar código Pix",
  pixCopied: "Código copiado!",
  pixReported: "Obrigado! Vamos confirmar o pagamento e liberar o plano (normalmente no mesmo dia útil).",
  iPaid: "Já paguei",
  pixNotConfigured: "O pagamento por Pix ainda não está disponível. Fale com a equipe para contratar.",
  talkToUs: "Falar com a equipe",
  invoices: "Cobranças",
  invoiceStatus: { pending: "Aguardando pagamento", paid: "Paga", canceled: "Cancelada" },
  noInvoices: "Nenhuma cobrança ainda.",
  cancelInvoice: "Cancelar",
  downgradeNote: "Sem pagamento, ao fim do período a organização volta aos limites do plano grátis. Nada é apagado.",
  reportTitle: "Relatório de impacto",
  reportSubtitle: (org) => `Ações ambientais comprovadas pelos participantes de ${org}.`,
  reportPrint: "Imprimir / salvar PDF",
  reportPeriod: "Período",
  reportByCategory: "Ações por tipo",
  reportTopMembers: "Participantes que mais contribuíram",
  reportTimeline: "Ações aprovadas por mês",
  reportVerify: "Confira estes números na página pública:",
  reportNeedsPlan: "O relatório de impacto em PDF faz parte dos planos Escola, Empresa e Prefeitura.",
  certificate: "Certificado",
  certificateTitle: "Certificado de participação",
  certificateBody: (name, org, actions, points) =>
    `Certificamos que ${name} participou das ações ambientais de ${org} pelo EcoVerify, com ${actions} ${actions === 1 ? "ação comprovada" : "ações comprovadas"} e ${points} pontos.`,
  certificateVerify: "Verifique a autenticidade pelo QR code ou pelo link:",
  certificateNeedsPlan: "Certificados fazem parte dos planos Escola, Empresa e Prefeitura.",
  publicPage: "Página pública",
  publicTitle: (org) => `Impacto de ${org}`,
  publicSubtitle: "Ações ambientais comprovadas com foto, GPS e moderação no EcoVerify.",
  publicJoinCta: "Quero criar a minha",
  upgradeCta: "Ver planos",
  ownerOnly: "Só o responsável pela organização pode mudar o plano.",
};

const en: OrgText = {
  ...pt,
  navOrgs: "Organizations",
  myOrgs: "My organizations",
  myOrgsSubtitle: "Schools, companies, city halls and groups you belong to.",
  noOrgs: "You are not part of any organization yet.",
  create: "Create organization",
  join: "Join with a code",
  joinTitle: "Join an organization",
  joinCodeLabel: "Invite code",
  joinCodePlaceholder: "e.g. ABCD2345",
  joinSubmit: "Join",
  joinConfirm: (org) => `You were invited to join ${org}.`,
  joinedAlready: "You are already a member of this organization.",
  newTitle: "Create organization",
  newSubtitle: "A space of your own with missions, ranking and reports. Takes less than a minute.",
  name: "Organization name",
  type: "Type",
  types: { school: "School", business: "Company", government: "City hall / government", ngo: "NGO / collective", other: "Other" },
  city: "City (optional)",
  plan: "Plan",
  cycle: "Billing",
  createSubmit: "Create organization",
  trialInfo: (days) => `Paid plans start with ${days} free days, no card. Then pay via Pix or go back to the free plan.`,
  trialUsedInfo: "The free trial has already been used.",
  roles: { owner: "Owner", manager: "Manager", member: "Member" },
  tabs: { overview: "Overview", missions: "Missions", moderation: "Moderation", members: "Members", plan: "Plan", report: "Report" },
  statMembers: "members",
  statActions: "approved actions",
  statPoints: "points",
  statMissions: "active missions",
  ranking: "Organization ranking",
  rankingEmpty: "The ranking appears once the first actions are approved.",
  orgMissions: "Organization missions",
  orgMissionsEmpty: "No missions yet.",
  sectionMine: "From your organization",
  privateBadge: "Members only",
  newMission: "New mission",
  missionTitle: "Title",
  missionDescription: "Description (what to do and what the photo must show)",
  missionCategory: "Category",
  missionPoints: "Points",
  missionScope: "Where",
  scopeAnywhere: "Anywhere (e.g. at home)",
  scopeLocal: "At a place (GPS checked)",
  missionLat: "Latitude",
  missionLng: "Longitude",
  useMyLocation: "Use my location",
  missionCreate: "Create mission",
  missionCreated: "Mission created!",
  activate: "Activate",
  deactivate: "Deactivate",
  active: "Active",
  inactive: "Inactive",
  pointsOnlyNote: "Organization missions give points and count in the ranking. Your own FONE rewards: Business plan (talk to us).",
  moderationEmpty: "No proofs waiting for review.",
  moderationHint: "Proofs of your organization's missions. AI already approves or rejects the clear cases.",
  inviteTitle: "Invite members",
  inviteHint: "Share the link or the code. People who join see the organization's missions.",
  inviteCopy: "Copy link",
  inviteCopied: "Link copied!",
  inviteRegenerate: "New code",
  memberSince: "since",
  makeManager: "Make manager",
  makeMember: "Make member",
  remove: "Remove",
  leave: "Leave organization",
  leaveConfirm: "Leave this organization?",
  teamNeedsPlan: "Managers besides the owner: School and Business plans.",
  usage: (used, max) => (max === null ? `${used} members` : `${used} of ${max} members`),
  missionUsage: (used, max) => (max === null ? `${used} active missions` : `${used} of ${max} active missions`),
  settingsTitle: "Organization details",
  brandColor: "Brand colour",
  brandNeedsPlan: "Custom colour: Business plan.",
  save: "Save",
  saved: "Saved!",
  errors: {
    invalid: "Check the fields.",
    not_found: "Organization not found.",
    invalid_code: "Invalid code.",
    member_limit: "The organization reached its plan's member limit. Ask the owner to upgrade.",
    mission_limit: "Active mission limit reached. Deactivate a mission or upgrade.",
    forbidden: "You don't have permission for that.",
    needs_plan: "Available on a paid plan.",
    owner_cannot_leave: "The owner can't leave. Transfer the organization first (contact support).",
    too_many: "Too many attempts. Try again later.",
    pix_unavailable: "Pix payment is not configured yet. Talk to us.",
    open_invoice: "There is already an open charge.",
  },
  currentPlan: "Current plan",
  statusLabels: { trialing: "Free trial", active: "Active", past_due: "Payment pending", canceled: "Canceled" },
  trialEnds: (days) => (days <= 0 ? "The trial has ended." : `The trial ends in ${days} day${days === 1 ? "" : "s"}.`),
  periodEnds: (date) => `Valid until ${date}.`,
  expiredNote: "The period ended: the organization uses the free plan limits until payment.",
  upgradeTitle: "Change or renew plan",
  choosePlan: "Choose the plan",
  payWithPix: "Pay with Pix",
  generatePix: "Generate Pix",
  pixTitle: "Pay with Pix",
  pixHowTo: "Open your bank app, choose Pix › Scan QR code (or Pix copy and paste) and confirm the amount. The plan is activated as soon as the payment is confirmed.",
  pixCopy: "Copy Pix code",
  pixCopied: "Code copied!",
  pixReported: "Thanks! We'll confirm the payment and activate the plan (usually the same business day).",
  iPaid: "I've paid",
  pixNotConfigured: "Pix payment is not available yet. Talk to us to subscribe.",
  talkToUs: "Talk to us",
  invoices: "Charges",
  invoiceStatus: { pending: "Awaiting payment", paid: "Paid", canceled: "Canceled" },
  noInvoices: "No charges yet.",
  cancelInvoice: "Cancel",
  downgradeNote: "Without payment, the organization goes back to the free plan limits at the end of the period. Nothing is deleted.",
  reportTitle: "Impact report",
  reportSubtitle: (org) => `Environmental actions proven by the members of ${org}.`,
  reportPrint: "Print / save as PDF",
  reportPeriod: "Period",
  reportByCategory: "Actions by type",
  reportTopMembers: "Top contributors",
  reportTimeline: "Approved actions per month",
  reportVerify: "Check these numbers on the public page:",
  reportNeedsPlan: "The PDF impact report is part of the School, Business and City hall plans.",
  certificate: "Certificate",
  certificateTitle: "Certificate of participation",
  certificateBody: (name, org, actions, points) =>
    `This certifies that ${name} took part in the environmental actions of ${org} on EcoVerify, with ${actions} proven ${actions === 1 ? "action" : "actions"} and ${points} points.`,
  certificateVerify: "Verify authenticity with the QR code or the link:",
  certificateNeedsPlan: "Certificates are part of the School, Business and City hall plans.",
  publicPage: "Public page",
  publicTitle: (org) => `${org}'s impact`,
  publicSubtitle: "Environmental actions proven with photo, GPS and moderation on EcoVerify.",
  publicJoinCta: "Create mine",
  upgradeCta: "See plans",
  ownerOnly: "Only the organization owner can change the plan.",
};

const es: OrgText = {
  ...pt,
  navOrgs: "Organizaciones",
  myOrgs: "Mis organizaciones",
  myOrgsSubtitle: "Escuelas, empresas, municipios y grupos de los que participas.",
  noOrgs: "Todavía no participas de ninguna organización.",
  create: "Crear organización",
  join: "Entrar con código",
  joinTitle: "Entrar en una organización",
  joinCodeLabel: "Código de invitación",
  joinCodePlaceholder: "Ej.: ABCD2345",
  joinSubmit: "Entrar",
  joinConfirm: (org) => `Te invitaron a participar de ${org}.`,
  joinedAlready: "Ya participas de esta organización.",
  newTitle: "Crear organización",
  newSubtitle: "Un espacio propio con misiones, ranking e informes. Toma menos de un minuto.",
  name: "Nombre de la organización",
  type: "Tipo",
  types: { school: "Escuela", business: "Empresa", government: "Municipio / gobierno", ngo: "ONG / colectivo", other: "Otro" },
  city: "Ciudad (opcional)",
  plan: "Plan",
  cycle: "Cobro",
  createSubmit: "Crear organización",
  trialInfo: (days) => `Los planes de pago empiezan con ${days} días gratis, sin tarjeta. Después, paga por Pix o vuelve al plan gratis.`,
  trialUsedInfo: "El período de prueba ya fue usado.",
  roles: { owner: "Responsable", manager: "Gestor", member: "Participante" },
  tabs: { overview: "Resumen", missions: "Misiones", moderation: "Moderación", members: "Participantes", plan: "Plan", report: "Informe" },
  statMembers: "participantes",
  statActions: "acciones aprobadas",
  statPoints: "puntos",
  statMissions: "misiones activas",
  ranking: "Ranking de la organización",
  rankingEmpty: "El ranking aparece cuando se aprueben las primeras acciones.",
  orgMissions: "Misiones de la organización",
  orgMissionsEmpty: "Todavía no hay misiones.",
  sectionMine: "De tu organización",
  privateBadge: "Solo participantes",
  newMission: "Nueva misión",
  missionTitle: "Título",
  missionDescription: "Descripción (qué hacer y qué debe mostrar la foto)",
  missionCategory: "Categoría",
  missionPoints: "Puntos",
  missionScope: "Dónde",
  scopeAnywhere: "En cualquier lugar (ej.: en casa)",
  scopeLocal: "En un lugar (verifica el GPS)",
  missionLat: "Latitud",
  missionLng: "Longitud",
  useMyLocation: "Usar mi ubicación",
  missionCreate: "Crear misión",
  missionCreated: "¡Misión creada!",
  activate: "Activar",
  deactivate: "Desactivar",
  active: "Activa",
  inactive: "Inactiva",
  pointsOnlyNote: "Las misiones de la organización dan puntos y cuentan en el ranking. Recompensas en FONE propias: plan Empresa (habla con el equipo).",
  moderationEmpty: "No hay comprobaciones esperando revisión.",
  moderationHint: "Comprobaciones de las misiones de tu organización. La IA ya aprueba o rechaza los casos claros.",
  inviteTitle: "Invita participantes",
  inviteHint: "Comparte el enlace o el código. Quien entre verá las misiones de la organización.",
  inviteCopy: "Copiar enlace",
  inviteCopied: "¡Enlace copiado!",
  inviteRegenerate: "Nuevo código",
  memberSince: "desde",
  makeManager: "Hacer gestor",
  makeMember: "Hacer participante",
  remove: "Quitar",
  leave: "Salir de la organización",
  leaveConfirm: "¿Salir de esta organización?",
  teamNeedsPlan: "Gestores además del responsable: planes Escuela y Empresa.",
  usage: (used, max) => (max === null ? `${used} participantes` : `${used} de ${max} participantes`),
  missionUsage: (used, max) => (max === null ? `${used} misiones activas` : `${used} de ${max} misiones activas`),
  settingsTitle: "Datos de la organización",
  brandColor: "Color de la organización",
  brandNeedsPlan: "Color propio: plan Empresa.",
  save: "Guardar",
  saved: "¡Guardado!",
  errors: {
    invalid: "Revisa los campos.",
    not_found: "Organización no encontrada.",
    invalid_code: "Código inválido.",
    member_limit: "La organización alcanzó el límite de participantes del plan. Pide al responsable que cambie de plan.",
    mission_limit: "Límite de misiones activas alcanzado. Desactiva una misión o cambia de plan.",
    forbidden: "No tienes permiso para eso.",
    needs_plan: "Disponible en un plan de pago.",
    owner_cannot_leave: "El responsable no puede salir. Transfiere la organización antes (contacta al soporte).",
    too_many: "Demasiados intentos. Inténtalo más tarde.",
    pix_unavailable: "El pago por Pix aún no está configurado. Habla con el equipo.",
    open_invoice: "Ya hay un cobro abierto.",
  },
  currentPlan: "Plan actual",
  statusLabels: { trialing: "Prueba gratis", active: "Activo", past_due: "Pago pendiente", canceled: "Cancelado" },
  trialEnds: (days) => (days <= 0 ? "La prueba terminó." : `La prueba termina en ${days} día${days === 1 ? "" : "s"}.`),
  periodEnds: (date) => `Válido hasta ${date}.`,
  expiredNote: "El período terminó: la organización usa los límites del plan gratis hasta el pago.",
  upgradeTitle: "Cambiar o renovar plan",
  choosePlan: "Elige el plan",
  payWithPix: "Pagar con Pix",
  generatePix: "Generar Pix",
  pixTitle: "Paga con Pix",
  pixHowTo: "Abre la app de tu banco, elige Pix › Leer código QR (o Pix copia y pega) y confirma el valor. El plan se activa cuando se confirma el pago.",
  pixCopy: "Copiar código Pix",
  pixCopied: "¡Código copiado!",
  pixReported: "¡Gracias! Confirmaremos el pago y activaremos el plan (normalmente el mismo día hábil).",
  iPaid: "Ya pagué",
  pixNotConfigured: "El pago por Pix aún no está disponible. Habla con el equipo para contratar.",
  talkToUs: "Hablar con el equipo",
  invoices: "Cobros",
  invoiceStatus: { pending: "Esperando pago", paid: "Pagado", canceled: "Cancelado" },
  noInvoices: "Todavía no hay cobros.",
  cancelInvoice: "Cancelar",
  downgradeNote: "Sin pago, al final del período la organización vuelve a los límites del plan gratis. No se borra nada.",
  reportTitle: "Informe de impacto",
  reportSubtitle: (org) => `Acciones ambientales comprobadas por los participantes de ${org}.`,
  reportPrint: "Imprimir / guardar PDF",
  reportPeriod: "Período",
  reportByCategory: "Acciones por tipo",
  reportTopMembers: "Participantes que más contribuyeron",
  reportTimeline: "Acciones aprobadas por mes",
  reportVerify: "Verifica estos números en la página pública:",
  reportNeedsPlan: "El informe de impacto en PDF es parte de los planes Escuela, Empresa y Municipio.",
  certificate: "Certificado",
  certificateTitle: "Certificado de participación",
  certificateBody: (name, org, actions, points) =>
    `Certificamos que ${name} participó de las acciones ambientales de ${org} en EcoVerify, con ${actions} ${actions === 1 ? "acción comprobada" : "acciones comprobadas"} y ${points} puntos.`,
  certificateVerify: "Verifica la autenticidad con el código QR o el enlace:",
  certificateNeedsPlan: "Los certificados son parte de los planes Escuela, Empresa y Municipio.",
  publicPage: "Página pública",
  publicTitle: (org) => `Impacto de ${org}`,
  publicSubtitle: "Acciones ambientales comprobadas con foto, GPS y moderación en EcoVerify.",
  publicJoinCta: "Quiero crear la mía",
  upgradeCta: "Ver planes",
  ownerOnly: "Solo el responsable de la organización puede cambiar el plan.",
};

export const ORG_TEXT: Record<Lang, OrgText> = { pt, en, es };
