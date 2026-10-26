import { t, type DictKey, type Lang } from "@/lib/i18n";

/**
 * Demo-only strings. Everything shared with the real app (menus, statuses, errors…)
 * comes from src/lib/i18n.ts through `t()`.
 */
const demoDict = {
  demo_banner: {
    pt: "Modo demonstração: dados simulados, salvos só neste aparelho",
    en: "Demo mode: simulated data, stored only on this device",
    es: "Modo demostración: datos simulados, guardados solo en este dispositivo",
  },
  demo_badge: { pt: "DEMO", en: "DEMO", es: "DEMO" },
  demo_login_title: { pt: "Experimente o EcoVerify", en: "Try EcoVerify", es: "Prueba EcoVerify" },
  demo_login_subtitle: {
    pt: "Versão de testes, sem servidor e sem internet. Escolha um perfil para entrar:",
    en: "Test version, no server or internet needed. Pick a profile to sign in:",
    es: "Versión de prueba, sin servidor ni internet. Elige un perfil para entrar:",
  },
  demo_role_citizen: { pt: "Cidadão", en: "Citizen", es: "Ciudadano" },
  demo_role_moderator: { pt: "Moderador", en: "Moderator", es: "Moderador" },
  demo_role_admin: { pt: "Administrador", en: "Administrator", es: "Administrador" },
  demo_role_citizen_desc: {
    pt: "Faz missões, envia comprovações e ganha pontos e FONE",
    en: "Completes missions, submits proof and earns points and FONE",
    es: "Hace misiones, envía comprobantes y gana puntos y FONE",
  },
  demo_role_moderator_desc: {
    pt: "Analisa as comprovações e aprova ou rejeita",
    en: "Reviews proof submissions and approves or rejects them",
    es: "Revisa los comprobantes y los aprueba o rechaza",
  },
  demo_role_admin_desc: {
    pt: "Cria missões, gerencia usuários e pagamentos",
    en: "Creates missions, manages users and payouts",
    es: "Crea misiones, gestiona usuarios y pagos",
  },
  demo_or_create: { pt: "ou crie sua própria conta de teste", en: "or create your own test account", es: "o crea tu propia cuenta de prueba" },
  demo_switch_profile: { pt: "Trocar perfil", en: "Switch profile", es: "Cambiar perfil" },
  demo_switch_hint: {
    pt: "Na demo você pode alternar entre perfis para testar o fluxo completo.",
    en: "In the demo you can switch profiles to test the whole flow.",
    es: "En la demo puedes alternar perfiles para probar el flujo completo.",
  },
  demo_reset: { pt: "Resetar demonstração", en: "Reset demo", es: "Reiniciar demostración" },
  demo_reset_confirm: {
    pt: "Apagar todos os dados da demonstração neste aparelho e começar do zero?",
    en: "Erase all demo data on this device and start over?",
    es: "¿Borrar todos los datos de la demostración en este dispositivo y empezar de cero?",
  },
  demo_storage_full: {
    pt: "O armazenamento da demo está cheio. Resete a demonstração no Perfil para continuar.",
    en: "Demo storage is full. Reset the demo in your Profile to continue.",
    es: "El almacenamiento de la demo está lleno. Reinicia la demostración en el Perfil.",
  },
  // Submission
  simulate_location: {
    pt: "Simular que estou no local (demo)",
    en: "Simulate being at the location (demo)",
    es: "Simular que estoy en el lugar (demo)",
  },
  simulate_location_hint: {
    pt: "No app real, você precisa estar a até 150 m do ponto da missão.",
    en: "In the real app you must be within 150 m of the mission point.",
    es: "En la app real debes estar a menos de 150 m del punto de la misión.",
  },
  location_simulated: { pt: "Localização simulada", en: "Simulated location", es: "Ubicación simulada" },
  location_real: { pt: "GPS do aparelho", en: "Device GPS", es: "GPS del dispositivo" },
  location_error: {
    pt: "Não foi possível obter sua localização. Permita o acesso ao GPS ou use a simulação.",
    en: "Couldn't get your location. Allow GPS access or use the simulation.",
    es: "No se pudo obtener tu ubicación. Permite el GPS o usa la simulación.",
  },
  distance_to_mission: { pt: "Distância até a missão", en: "Distance to mission", es: "Distancia a la misión" },
  report_placeholder: {
    pt: "Conte como foi a experiência, onde e como você realizou a ação...",
    en: "Describe the experience: where and how you completed the action...",
    es: "Cuenta cómo fue la experiencia, dónde y cómo realizaste la acción...",
  },
  report_missing: { pt: "Faltam {n} caracteres para o mínimo de 50.", en: "{n} more characters to reach 50.", es: "Faltan {n} caracteres para el mínimo de 50." },
  what_to_do: { pt: "O que fazer", en: "What to do", es: "Qué hacer" },
  why_it_matters: { pt: "Por que importa", en: "Why it matters", es: "Por qué importa" },
  back: { pt: "Voltar", en: "Back", es: "Volver" },
  submitted_at: { pt: "Enviada em", en: "Submitted on", es: "Enviado el" },
  rejection_reason: { pt: "Motivo", en: "Reason", es: "Motivo" },
  reason_too_short: { pt: "O motivo precisa ter pelo menos 5 caracteres.", en: "The reason must have at least 5 characters.", es: "El motivo debe tener al menos 5 caracteres." },
  author: { pt: "Autor", en: "Author", es: "Autor" },
  // Notifications
  notif_approved_title: { pt: "Comprovação aprovada! 🎉", en: "Proof approved! 🎉", es: "¡Comprobante aprobado! 🎉" },
  notif_approved_msg: {
    pt: "Sua comprovação para \"{mission}\" foi aprovada. Você ganhou {points} pontos e {fone} FONE entrou na fila de pagamento.",
    en: "Your proof for \"{mission}\" was approved. You earned {points} points and {fone} FONE is queued for payout.",
    es: "Tu comprobante para \"{mission}\" fue aprobado. Ganaste {points} puntos y {fone} FONE entró en la cola de pago.",
  },
  notif_rejected_title: { pt: "Comprovação rejeitada", en: "Proof rejected", es: "Comprobante rechazado" },
  notif_rejected_msg: {
    pt: "Sua comprovação para \"{mission}\" foi rejeitada. Motivo: {reason}. Você pode enviar uma nova comprovação.",
    en: "Your proof for \"{mission}\" was rejected. Reason: {reason}. You can submit new proof.",
    es: "Tu comprobante para \"{mission}\" fue rechazado. Motivo: {reason}. Puedes enviar uno nuevo.",
  },
  notif_paid_title: { pt: "FONE enviado 🪙", en: "FONE sent 🪙", es: "FONE enviado 🪙" },
  notif_paid_msg: {
    pt: "{fone} FONE foram enviados para sua carteira (transação simulada).",
    en: "{fone} FONE were sent to your wallet (simulated transaction).",
    es: "{fone} FONE fueron enviados a tu billetera (transacción simulada).",
  },
  notif_welcome_title: { pt: "Bem-vindo(a) ao EcoVerify! 🌱", en: "Welcome to EcoVerify! 🌱", es: "¡Bienvenido(a) a EcoVerify! 🌱" },
  notif_welcome_msg: {
    pt: "Escolha uma missão, realize a ação e envie sua comprovação. Na demo, use \"Simular que estou no local\".",
    en: "Pick a mission, complete it and submit your proof. In the demo, use \"Simulate being at the location\".",
    es: "Elige una misión, realízala y envía tu comprobante. En la demo, usa \"Simular que estoy en el lugar\".",
  },
  mark_all_read: { pt: "Marcar todas como lidas", en: "Mark all as read", es: "Marcar todas como leídas" },
  // Profile / wallet
  level: { pt: "Nível", en: "Level", es: "Nivel" },
  fone_received: { pt: "FONE recebido", en: "FONE received", es: "FONE recibido" },
  fone_pending: { pt: "FONE a receber", en: "FONE pending", es: "FONE por recibir" },
  approved_actions: { pt: "Ações aprovadas", en: "Approved actions", es: "Acciones aprobadas" },
  wallet_label: { pt: "Carteira FONE", en: "FONE wallet", es: "Billetera FONE" },
  wallet_none: { pt: "Nenhuma carteira vinculada", en: "No wallet linked", es: "Ninguna billetera vinculada" },
  wallet_demo_note: {
    pt: "Na demo a carteira e os pagamentos são simulados. Nenhum FONE real é movimentado.",
    en: "In the demo, wallet and payouts are simulated. No real FONE is moved.",
    es: "En la demo la billetera y los pagos son simulados. No se mueve FONE real.",
  },
  wallet_create_demo: { pt: "Criar carteira de teste", en: "Create test wallet", es: "Crear billetera de prueba" },
  wallet_change: { pt: "Alterar", en: "Change", es: "Cambiar" },
  member_since: { pt: "Membro desde", en: "Member since", es: "Miembro desde" },
  // Admin
  metric_users: { pt: "Usuários", en: "Users", es: "Usuarios" },
  metric_active_missions: { pt: "Missões ativas", en: "Active missions", es: "Misiones activas" },
  metric_pending: { pt: "Aguardando moderação", en: "Awaiting review", es: "Esperando moderación" },
  metric_approved: { pt: "Ações aprovadas", en: "Approved actions", es: "Acciones aprobadas" },
  metric_fone_paid: { pt: "FONE pago", en: "FONE paid", es: "FONE pagado" },
  metric_fone_queue: { pt: "FONE na fila", en: "FONE queued", es: "FONE en cola" },
  new_mission: { pt: "Nova missão", en: "New mission", es: "Nueva misión" },
  field_title: { pt: "Título", en: "Title", es: "Título" },
  field_description: { pt: "Descrição", en: "Description", es: "Descripción" },
  field_category: { pt: "Categoria", en: "Category", es: "Categoría" },
  field_points: { pt: "Pontos", en: "Points", es: "Puntos" },
  field_fone: { pt: "Recompensa (FONE)", en: "Reward (FONE)", es: "Recompensa (FONE)" },
  field_latitude: { pt: "Latitude", en: "Latitude", es: "Latitud" },
  field_longitude: { pt: "Longitude", en: "Longitude", es: "Longitud" },
  use_my_location: { pt: "Usar minha localização", en: "Use my location", es: "Usar mi ubicación" },
  create_mission: { pt: "Criar missão", en: "Create mission", es: "Crear misión" },
  mission_created: { pt: "Missão criada!", en: "Mission created!", es: "¡Misión creada!" },
  invalid_form: { pt: "Preencha todos os campos corretamente.", en: "Please fill in all fields correctly.", es: "Completa todos los campos correctamente." },
  active: { pt: "Ativa", en: "Active", es: "Activa" },
  inactive: { pt: "Inativa", en: "Inactive", es: "Inactiva" },
  activate: { pt: "Ativar", en: "Activate", es: "Activar" },
  deactivate: { pt: "Desativar", en: "Deactivate", es: "Desactivar" },
  ban: { pt: "Banir", en: "Ban", es: "Bloquear" },
  unban: { pt: "Desbanir", en: "Unban", es: "Desbloquear" },
  banned_label: { pt: "BANIDO", en: "BANNED", es: "BLOQUEADO" },
  ban_reason_prompt: { pt: "Motivo do banimento:", en: "Ban reason:", es: "Motivo del bloqueo:" },
  reward_pending: { pt: "Pendente", en: "Pending", es: "Pendiente" },
  reward_paid: { pt: "Pago", en: "Paid", es: "Pagado" },
  simulate_payment: { pt: "Simular pagamento", en: "Simulate payout", es: "Simular pago" },
  no_wallet_warning: { pt: "Usuário sem carteira", en: "User has no wallet", es: "Usuario sin billetera" },
  no_rewards: { pt: "Nenhuma recompensa ainda.", en: "No rewards yet.", es: "Aún no hay recompensas." },
  you: { pt: "você", en: "you", es: "tú" },
  // Community
  community_subtitle: { pt: "Converse com outros guardiões do planeta", en: "Chat with other planet guardians", es: "Conversa con otros guardianes del planeta" },
  community_citizens_only: {
    pt: "O chat da comunidade é exclusivo para cidadãos. Troque para o perfil Cidadão para testar.",
    en: "The community chat is for citizens only. Switch to the Citizen profile to try it.",
    es: "El chat de la comunidad es solo para ciudadanos. Cambia al perfil Ciudadano para probarlo.",
  },
  message_deleted: { pt: "Mensagem apagada", en: "Message deleted", es: "Mensaje eliminado" },
  // Register
  register_demo_note: {
    pt: "A conta fica salva só neste aparelho. Use qualquer e-mail, ele não é verificado.",
    en: "The account is stored only on this device. Any e-mail works, it isn't verified.",
    es: "La cuenta se guarda solo en este dispositivo. Cualquier correo sirve, no se verifica.",
  },
  more: { pt: "Mais", en: "More", es: "Más" },
  have_demo_profiles: { pt: "Usar um perfil pronto", en: "Use a ready-made profile", es: "Usar un perfil listo" },
} satisfies Record<string, Record<Lang, string>>;

export type DemoKey = keyof typeof demoDict;

export function dt(lang: Lang, key: DemoKey, vars?: Record<string, string | number>): string {
  let text: string = demoDict[key][lang] ?? demoDict[key].pt;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}

/** Canned replies from the fictional community members. */
export const botReplies: Record<Lang, string[]> = {
  pt: [
    "Que massa! 👏 Bora junto na próxima!",
    "Isso aí! Cada ação conta 🌱",
    "Vou participar também, onde vai ser?",
    "Parabéns pela iniciativa! 💚",
    "Fiz a missão da praia ontem, recomendo demais 🌊",
  ],
  en: [
    "Awesome! 👏 Let's team up next time!",
    "That's it! Every action counts 🌱",
    "I'll join too, where is it?",
    "Great initiative! 💚",
    "I did the beach mission yesterday, highly recommend 🌊",
  ],
  es: [
    "¡Genial! 👏 ¡Vamos juntos la próxima!",
    "¡Eso! Cada acción cuenta 🌱",
    "Yo también participo, ¿dónde será?",
    "¡Felicitaciones por la iniciativa! 💚",
    "Hice la misión de la playa ayer, la recomiendo 🌊",
  ],
};

/** Translates an error code returned by the store (shared i18n key, demo key or "storage"). */
export function errorText(lang: Lang, code: string): string {
  if (code === "storage") return dt(lang, "demo_storage_full");
  if (code in demoDict) return dt(lang, code as DemoKey);
  const shared = t(lang, code as DictKey);
  return shared === code ? t(lang, "error_generic") : shared;
}
