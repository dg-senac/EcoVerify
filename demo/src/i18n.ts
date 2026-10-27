import { t, type DictKey, type Lang } from "@/lib/i18n";

/**
 * Demo-only strings. Everything shared with the real app (menus, statuses, errors…)
 * comes from src/lib/i18n.ts through `t()`.
 */
const demoDict = {
  demo_osm_note: {
    pt: "Na demo, criamos lugares de exemplo perto do centro da cidade. No app completo eles vêm do OpenStreetMap (praias, parques e pontos de coleta) e só pagam FONE depois que a equipe revisa.",
    en: "In the demo we create example places near the city centre. In the full app they come from OpenStreetMap (beaches, parks and collection points) and only pay FONE after the team reviews them.",
    es: "En la demo creamos lugares de ejemplo cerca del centro de la ciudad. En la app completa vienen de OpenStreetMap (playas, parques y puntos de recolección) y solo pagan FONE después de que el equipo los revisa.",
  },
  demo_region_recife: { pt: "Usar Recife (cidade da demo)", en: "Use Recife (demo city)", es: "Usar Recife (ciudad de la demo)" },
  review_title: { pt: "Para revisar", en: "To review", es: "Para revisar" },
  review_hint: {
    pt: "Missões criadas automaticamente para cidades sem missões. Já aparecem, mas dão só pontos até você revisar.",
    en: "Missions created automatically for cities without missions. They are visible but pay points only until you review them.",
    es: "Misiones creadas automáticamente para ciudades sin misiones. Ya aparecen, pero solo dan puntos hasta que las revises.",
  },
  review_fone: { pt: "Aprovar com FONE", en: "Approve with FONE", es: "Aprobar con FONE" },
  review_points: { pt: "Manter só pontos", en: "Keep points only", es: "Mantener solo puntos" },
  review_off: { pt: "Desativar", en: "Switch off", es: "Desactivar" },
  city_demand: { pt: "Cidades pedindo missões", en: "Cities asking for missions", es: "Ciudades pidiendo misiones" },
  field_anywhere: { pt: "Pode ser feita em qualquer lugar (ex.: em casa)", en: "Can be done anywhere (e.g. at home)", es: "Se puede hacer en cualquier lugar (ej.: en casa)" },
  field_sponsor: { pt: "Apoio local (opcional)", en: "Local supporter (optional)", es: "Apoyo local (opcional)" },
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
  notif_ai_approved_msg: {
    pt: "Sua comprovação para \"{mission}\" foi aprovada pela verificação automática. Você ganhou {points} pontos e {fone} FONE entrou na fila de pagamento.",
    en: "Your proof for \"{mission}\" was approved by the automatic verification. You earned {points} points and {fone} FONE is queued for payout.",
    es: "Tu comprobante para \"{mission}\" fue aprobado por la verificación automática. Ganaste {points} puntos y {fone} FONE entró en la cola de pago.",
  },
  notif_ai_rejected_title: { pt: "Comprovação rejeitada pela verificação automática", en: "Proof rejected by the automatic verification", es: "Comprobante rechazado por la verificación automática" },
  notif_ai_rejected_msg: {
    pt: "Sua comprovação para \"{mission}\" foi rejeitada. Motivo: {reason} Se achar que houve engano, abra \"Minhas Submissões\" e toque em \"Contestar\" para um moderador revisar.",
    en: "Your proof for \"{mission}\" was rejected. Reason: {reason} If you think this is a mistake, open \"My Submissions\" and tap \"Appeal\" so a moderator reviews it.",
    es: "Tu comprobante para \"{mission}\" fue rechazado. Motivo: {reason} Si crees que es un error, abre \"Mis Envíos\" y toca \"Apelar\" para que un moderador lo revise.",
  },
  // Simulated automatic verification
  sample_title: { pt: "Sem câmera? Use uma foto de exemplo", en: "No camera? Use a sample photo", es: "¿Sin cámara? Usa una foto de ejemplo" },
  sample_hint: {
    pt: "Na demo a IA é simulada: a foto que combina com a missão é aprovada sozinha; outra categoria ou foto de tela é rejeitada com o motivo. Fotos da câmera vão para a moderação.",
    en: "In the demo the AI is simulated: a photo that matches the mission is approved automatically; another category or a photo of a screen is rejected with the reason. Camera photos go to the moderators.",
    es: "En la demo la IA es simulada: la foto que coincide con la misión se aprueba sola; otra categoría o una foto de pantalla se rechaza con el motivo. Las fotos de la cámara van a moderación.",
  },
  sample_screen: { pt: "Foto de tela", en: "Photo of a screen", es: "Foto de pantalla" },
  sim_seen: { pt: "Foto de exemplo: {what}.", en: "Sample photo: {what}.", es: "Foto de ejemplo: {what}." },
  sim_match: { pt: "A foto mostra a ação pedida na missão. (análise simulada)", en: "The photo shows the action the mission asks for. (simulated analysis)", es: "La foto muestra la acción que pide la misión. (análisis simulado)" },
  sim_mismatch: { pt: "A foto mostra outro tipo de ação, não a desta missão. (análise simulada)", en: "The photo shows a different kind of action, not this mission's. (simulated analysis)", es: "La foto muestra otro tipo de acción, no la de esta misión. (análisis simulado)" },
  sim_screen: { pt: "Parece a foto de uma tela de celular, não uma foto tirada no local. (análise simulada)", en: "It looks like a picture of a phone screen, not a photo taken on site. (simulated analysis)", es: "Parece la foto de una pantalla de celular, no una foto tomada en el lugar. (análisis simulado)" },
  sim_other: { pt: "Missão livre: a foto parece uma ação sustentável, mas uma pessoa confirma. (análise simulada)", en: "Open mission: the photo looks like a sustainable action, but a person confirms. (simulated analysis)", es: "Misión libre: la foto parece una acción sostenible, pero una persona confirma. (análisis simulado)" },
  sim_real_photo: { pt: "Na demo não há IA de verdade: fotos da câmera vão para a moderação.", en: "There is no real AI in the demo: camera photos go to the moderators.", es: "En la demo no hay IA real: las fotos de la cámara van a moderación." },
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
  wallet_demo_note: {
    pt: "Na demo a carteira e os pagamentos são simulados. Nenhum FONE real é movimentado.",
    en: "In the demo, wallet and payouts are simulated. No real FONE is moved.",
    es: "En la demo la billetera y los pagos son simulados. No se mueve FONE real.",
  },
  wallet_demo_note_verify: {
    pt: "Na demo você pode colar qualquer endereço no formato FONE (64 caracteres começando com \"f\") e simular a verificação. No app real, o envio é conferido no explorer da Fone.",
    en: "In the demo you can paste any address in FONE format (64 characters starting with \"f\") and simulate the verification. In the real app the transfer is checked on the Fone explorer.",
    es: "En la demo puedes pegar cualquier dirección en formato FONE (64 caracteres empezando con \"f\") y simular la verificación. En la app real, el envío se revisa en el explorador de Fone.",
  },
  wallet_simulate: { pt: "Simular verificação (demo)", en: "Simulate verification (demo)", es: "Simular verificación (demo)" },
  wallet_fill_example: { pt: "Usar endereço de exemplo", en: "Use sample address", es: "Usar dirección de ejemplo" },
  notif_wallet_title: { pt: "Carteira verificada ✅", en: "Wallet verified ✅", es: "Billetera verificada ✅" },
  notif_wallet_msg: {
    pt: "Sua carteira FONE foi verificada. Suas recompensas em FONE serão enviadas para ela (simulado).",
    en: "Your FONE wallet was verified. Your FONE rewards will be sent to it (simulated).",
    es: "Tu billetera FONE fue verificada. Tus recompensas en FONE se enviarán a ella (simulado).",
  },
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
  no_wallet_warning: { pt: "Usuário sem carteira verificada", en: "User has no verified wallet", es: "Usuario sin billetera verificada" },
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
  // Account & LGPD
  deleted_account_name: { pt: "Conta excluída", en: "Deleted account", es: "Cuenta eliminada" },
  demo_account_note: {
    pt: "No app real: confirmação de e-mail, troca de senha e exclusão protegida por senha. Aqui tudo fica só neste aparelho.",
    en: "In the real app: e-mail confirmation, password change and password-protected deletion. Here everything stays on this device.",
    es: "En la app real: confirmación de correo, cambio de contraseña y eliminación protegida por contraseña. Aquí todo queda en este dispositivo.",
  },
  demo_account_deleted: {
    pt: "Conta excluída neste aparelho. Para recriá-la, use \"Resetar demonstração\" em Configurações.",
    en: "Account deleted on this device. To bring it back, use \"Reset demo\" in Settings.",
    es: "Cuenta eliminada en este dispositivo. Para recrearla, usa \"Reiniciar demostración\" en Configuración.",
  },
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
  if (shared !== code) return shared;
  const prefixed = t(lang, `error_${code}` as DictKey);
  return prefixed === `error_${code}` ? t(lang, "error_generic") : prefixed;
}
