import { t, type DictKey, type Lang } from "@/lib/i18n";

/**
 * Strings of the standalone app (demo/). Everything shared with the real app (menus, statuses, errors…)
 * comes from src/lib/i18n.ts through `t()`.
 */
const demoDict = {
  // FONE safety (mirror of src/lib/payout-rules.ts)
  notif_approved_points_msg: {
    pt: "Sua comprovação para \"{mission}\" foi aprovada. Você ganhou {points} pontos.",
    en: "Your proof for \"{mission}\" was approved. You earned {points} points.",
    es: "Tu comprobante para \"{mission}\" fue aprobado. Ganaste {points} puntos.",
  },
  notif_hold_title: { pt: "Seu FONE ficou em espera", en: "Your FONE is on hold", es: "Tu FONE quedó en espera" },
  notif_hold_budget: {
    pt: "Os pontos já foram creditados, mas {fone} FONE ficou em espera porque o orçamento de FONE deste mês foi atingido. Nada é perdido.",
    en: "Your points were credited, but {fone} FONE is on hold because this month's FONE budget was reached. Nothing is lost.",
    es: "Los puntos ya fueron acreditados, pero {fone} FONE quedó en espera porque se alcanzó el presupuesto de FONE del mes. No se pierde nada.",
  },
  notif_hold_user_cap: {
    pt: "Os pontos já foram creditados, mas {fone} FONE ficou em espera porque você atingiu o limite mensal de FONE por pessoa. Nada é perdido.",
    en: "Your points were credited, but {fone} FONE is on hold because you reached the monthly FONE limit per person. Nothing is lost.",
    es: "Los puntos ya fueron acreditados, pero {fone} FONE quedó en espera porque alcanzaste el límite mensual de FONE por persona. No se pierde nada.",
  },
  notif_hold_sponsor: {
    pt: "Os pontos já foram creditados, mas {fone} FONE ficou em espera porque o orçamento do patrocinador desta missão acabou. Nada é perdido.",
    en: "Your points were credited, but {fone} FONE is on hold because this mission's sponsor budget ran out. Nothing is lost.",
    es: "Los puntos ya fueron acreditados, pero {fone} FONE quedó en espera porque se acabó el presupuesto del patrocinador de esta misión. No se pierde nada.",
  },
  notif_released_title: { pt: "FONE liberado ✅", en: "FONE released ✅", es: "FONE liberado ✅" },
  notif_released_msg: {
    pt: "{fone} FONE que estava em espera voltou para a fila de pagamento.",
    en: "{fone} FONE that was on hold is back in the payment queue.",
    es: "{fone} FONE que estaba en espera volvió a la cola de pago.",
  },
  payout_nothing_ready: { pt: "Nada liberado para pagar ainda (carência ou espera).", en: "Nothing released to pay yet (hold period or on hold).", es: "Nada liberado para pagar todavía (carencia o espera)." },
  payout_min_error: { pt: "O valor liberado ainda está abaixo do pagamento mínimo.", en: "The released amount is still below the minimum payout.", es: "El monto liberado aún está por debajo del pago mínimo." },
  payout_rules_title: { pt: "Regras de pagamento", en: "Payout rules", es: "Reglas de pago" },
  payout_rules_hint: {
    pt: "Protegem a carteira de recompensas: pontos nunca são afetados, só quando e quanto FONE sai.",
    en: "They protect the rewards wallet: points are never affected, only when and how much FONE goes out.",
    es: "Protegen la billetera de recompensas: los puntos nunca se ven afectados, solo cuándo y cuánto FONE sale.",
  },
  payout_min_label: { pt: "Pagamento mínimo (FONE)", en: "Minimum payout (FONE)", es: "Pago mínimo (FONE)" },
  payout_hold_label: { pt: "Carência (dias)", en: "Hold period (days)", es: "Carencia (días)" },
  payout_budget_label: { pt: "Orçamento mensal da tesouraria (FONE)", en: "Treasury monthly budget (FONE)", es: "Presupuesto mensual de la tesorería (FONE)" },
  payout_cap_label: { pt: "Limite por pessoa por mês (FONE)", en: "Limit per person per month (FONE)", es: "Límite por persona al mes (FONE)" },
  payout_no_limit: { pt: "Sem limite", en: "No limit", es: "Sin límite" },
  payout_save: { pt: "Salvar regras", en: "Save rules", es: "Guardar reglas" },
  payout_saved: { pt: "Regras salvas", en: "Rules saved", es: "Reglas guardadas" },
  payout_month_used: { pt: "FONE da tesouraria comprometido este mês", en: "Treasury FONE committed this month", es: "FONE de la tesorería comprometido este mes" },
  payout_budget_warn: { pt: "Atenção: o orçamento do mês está quase no fim.", en: "Heads-up: this month's budget is almost used up.", es: "Atención: el presupuesto del mes casi se acaba." },
  payout_budget_over: { pt: "Orçamento esgotado: novas recompensas ficam em espera.", en: "Budget used up: new rewards go on hold.", es: "Presupuesto agotado: las nuevas recompensas quedan en espera." },
  held_title: { pt: "FONE em espera", en: "FONE on hold", es: "FONE en espera" },
  held_budget: { pt: "Orçamento do mês", en: "Monthly budget", es: "Presupuesto del mes" },
  held_user_cap: { pt: "Limite por pessoa", en: "Per-person limit", es: "Límite por persona" },
  held_sponsor_budget: { pt: "Orçamento de patrocinador", en: "Sponsor budget", es: "Presupuesto de patrocinador" },
  release: { pt: "Liberar", en: "Release", es: "Liberar" },
  payout_waiting_chip: { pt: "⏳ {fone} FONE em carência · libera em {date}", en: "⏳ {fone} FONE in hold period · released on {date}", es: "⏳ {fone} FONE en carencia · se libera el {date}" },
  payout_held_chip: { pt: "✋ {fone} FONE em espera", en: "✋ {fone} FONE on hold", es: "✋ {fone} FONE en espera" },
  payout_min_chip: { pt: "Abaixo do mínimo de {min} FONE", en: "Below the {min} FONE minimum", es: "Por debajo del mínimo de {min} FONE" },
  payout_fee_chip: { pt: "Taxa da rede ≈ 0.15 FONE ({pct}% do envio)", en: "Network fee ≈ 0.15 FONE ({pct}% of the transfer)", es: "Comisión de red ≈ 0.15 FONE ({pct}% del envío)" },
  pay_now: {
    pt: "Pagar {fone} FONE",
    en: "Pay {fone} FONE",
    es: "Pagar {fone} FONE",
  },
  skip_hold: {
    pt: "⏩ Antecipar fim da carência",
    en: "⏩ Skip hold period",
    es: "⏩ Adelantar fin de la carencia",
  },
  skip_hold_hint: {
    pt: "Adianta o relógio para as recompensas em carência poderem ser pagas agora.",
    en: "Moves the clock forward so rewards in the hold period can be paid now.",
    es: "Adelanta el reloj para que las recompensas en carencia puedan pagarse ahora.",
  },
  paid_recently: { pt: "Pagos recentemente", en: "Recently paid", es: "Pagados recientemente" },
  sponsors_title: { pt: "Patrocinadores", en: "Sponsors", es: "Patrocinadores" },
  sponsors_hint: {
    pt: "Empresas, prefeituras ou ONGs que bancam missões com FONE próprio. Quando o orçamento acaba, o FONE fica em espera até uma recarga.",
    en: "Companies, city halls or NGOs that fund missions with their own FONE. When the budget runs out, the FONE stays on hold until a top-up.",
    es: "Empresas, alcaldías u ONG que financian misiones con FONE propio. Cuando se acaba el presupuesto, el FONE queda en espera hasta una recarga.",
  },
  sponsor_name: { pt: "Nome do patrocinador", en: "Sponsor name", es: "Nombre del patrocinador" },
  sponsor_budget: { pt: "Orçamento (FONE)", en: "Budget (FONE)", es: "Presupuesto (FONE)" },
  sponsor_add: { pt: "Adicionar", en: "Add", es: "Añadir" },
  sponsor_topup: { pt: "Recarregar", en: "Top up", es: "Recargar" },
  sponsor_left: { pt: "Restam {left} de {budget} FONE", en: "{left} of {budget} FONE left", es: "Quedan {left} de {budget} FONE" },
  field_sponsor_pays: { pt: "Patrocinador que paga o FONE", en: "Sponsor paying the FONE", es: "Patrocinador que paga el FONE" },
  treasury_option: { pt: "Tesouraria do EcoVerify", en: "EcoVerify treasury", es: "Tesorería de EcoVerify" },
  transparency_link: { pt: "Transparência", en: "Transparency", es: "Transparencia" },
  demo_osm_note: {
    pt: "Criamos missões sugeridas perto do centro da cidade (praias, parques e pontos de coleta). Elas já dão pontos e só pagam FONE depois que a equipe revisa.",
    en: "We create suggested missions near the city centre (beaches, parks and collection points). They give points right away and only pay FONE after the team reviews them.",
    es: "Creamos misiones sugeridas cerca del centro de la ciudad (playas, parques y puntos de recolección). Ya dan puntos y solo pagan FONE después de que el equipo las revisa.",
  },
  demo_region_recife: {
    pt: "Usar Recife",
    en: "Use Recife",
    es: "Usar Recife",
  },
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
  demo_login_title: {
    pt: "Bem-vindo(a) ao EcoVerify",
    en: "Welcome to EcoVerify",
    es: "Bienvenido(a) a EcoVerify",
  },
  demo_login_subtitle: {
    pt: "Escolha um perfil para entrar:",
    en: "Choose a profile to sign in:",
    es: "Elige un perfil para entrar:",
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
    pt: "Revisa comprovações duvidosas e contestações, dá cartão amarelo",
    en: "Reviews doubtful proofs and appeals, gives yellow cards",
    es: "Revisa comprobantes dudosos y apelaciones, da tarjeta amarilla",
  },
  demo_role_org: { pt: "Coordenadora de organização", en: "Organization coordinator", es: "Coordinadora de organización" },
  demo_role_org_desc: {
    pt: "Professora da Escola Técnica Horizonte: missões da escola, mutirões e relatório",
    en: "Teacher at Escola Técnica Horizonte: school missions, clean-up events and report",
    es: "Profesora de la Escola Técnica Horizonte: misiones de la escuela, jornadas e informe",
  },
  demo_role_admin_desc: {
    pt: "Cria missões, gerencia usuários e pagamentos",
    en: "Creates missions, manages users and payouts",
    es: "Crea misiones, gestiona usuarios y pagos",
  },
  demo_or_create: {
    pt: "ou crie sua conta",
    en: "or create your account",
    es: "o crea tu cuenta",
  },
  demo_switch_profile: { pt: "Trocar perfil", en: "Switch profile", es: "Cambiar perfil" },
  demo_switch_hint: {
    pt: "Alterne entre perfis para ver o app de cada papel.",
    en: "Switch profiles to see the app from each role.",
    es: "Alterna perfiles para ver la app de cada rol.",
  },
  demo_reset: {
    pt: "Restaurar dados iniciais",
    en: "Restore initial data",
    es: "Restaurar datos iniciales",
  },
  demo_reset_confirm: {
    pt: "Apagar todos os dados e voltar ao início?",
    en: "Erase all data and start over?",
    es: "¿Borrar todos los datos y volver al inicio?",
  },
  demo_storage_full: {
    pt: "O armazenamento do aparelho está cheio. Restaure os dados iniciais em Configurações para continuar.",
    en: "Device storage is full. Restore the initial data in Settings to continue.",
    es: "El almacenamiento del dispositivo está lleno. Restaura los datos iniciales en Configuración para continuar.",
  },
  // Submission
  simulate_location: {
    pt: "Usar o local da missão",
    en: "Use the mission location",
    es: "Usar la ubicación de la misión",
  },
  simulate_location_hint: {
    pt: "Use se o GPS do aparelho não conseguir confirmar sua posição. A moderação vê qual opção foi usada.",
    en: "Use it if your device GPS can't confirm your position. Moderators can see which option was used.",
    es: "Úsalo si el GPS del dispositivo no puede confirmar tu posición. La moderación ve qué opción se usó.",
  },
  location_simulated: {
    pt: "Local da missão",
    en: "Mission location",
    es: "Ubicación de la misión",
  },
  location_real: { pt: "GPS do aparelho", en: "Device GPS", es: "GPS del dispositivo" },
  location_error: {
    pt: "Não foi possível obter sua localização. Permita o acesso ao GPS ou use o local da missão.",
    en: "Couldn't get your location. Allow GPS access or use the mission location.",
    es: "No se pudo obtener tu ubicación. Permite el GPS o usa la ubicación de la misión.",
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
    pt: "Sua comprovação para \"{mission}\" foi rejeitada. Motivo: {reason} Se achar que houve engano, abra \"Meus envios\" e toque em \"Contestar\" para um moderador revisar.",
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
  sample_internet: { pt: "Foto da internet", en: "Photo from the internet", es: "Foto de internet" },
  sim_internet: {
    pt: "A imagem tem marca d'água e legenda de um site de fotos: pode ter sido copiada da internet. Uma pessoa da equipe vai conferir. (análise simulada)",
    en: "The image has a watermark and a caption from a photo site: it may have been copied from the internet. A team member will check it. (simulated analysis)",
    es: "La imagen tiene marca de agua y leyenda de un sitio de fotos: puede haber sido copiada de internet. Una persona del equipo la revisará. (análisis simulado)",
  },
  sim_internet_signs: {
    pt: "Marca d'água \"© fotosgratis\" repetida em diagonal e legenda com endereço de site e número de ID na parte de baixo.",
    en: "\"© fotosgratis\" watermark repeated diagonally and a caption with a website address and an ID number at the bottom.",
    es: "Marca de agua \"© fotosgratis\" repetida en diagonal y leyenda con dirección de sitio y número de ID abajo.",
  },
  sim_seen: { pt: "Foto de exemplo: {what}.", en: "Sample photo: {what}.", es: "Foto de ejemplo: {what}." },
  sim_match: { pt: "A foto mostra a ação pedida na missão. (análise simulada)", en: "The photo shows the action the mission asks for. (simulated analysis)", es: "La foto muestra la acción que pide la misión. (análisis simulado)" },
  sim_mismatch: { pt: "A foto mostra outro tipo de ação, não a desta missão. (análise simulada)", en: "The photo shows a different kind of action, not this mission's. (simulated analysis)", es: "La foto muestra otro tipo de acción, no la de esta misión. (análisis simulado)" },
  sim_screen: { pt: "Parece a foto de uma tela de celular, não uma foto tirada no local. (análise simulada)", en: "It looks like a picture of a phone screen, not a photo taken on site. (simulated analysis)", es: "Parece la foto de una pantalla de celular, no una foto tomada en el lugar. (análisis simulado)" },
  sim_other: { pt: "Missão livre: a foto parece uma ação sustentável, mas uma pessoa confirma. (análise simulada)", en: "Open mission: the photo looks like a sustainable action, but a person confirms. (simulated analysis)", es: "Misión libre: la foto parece una acción sostenible, pero una persona confirma. (análisis simulado)" },
  sim_real_photo: { pt: "Na demo não há IA de verdade: fotos da câmera vão para a moderação.", en: "There is no real AI in the demo: camera photos go to the moderators.", es: "En la demo no hay IA real: las fotos de la cámara van a moderación." },
  notif_paid_title: { pt: "FONE enviado 🪙", en: "FONE sent 🪙", es: "FONE enviado 🪙" },
  notif_paid_msg: {
    pt: "{fone} FONE foram enviados para sua carteira.",
    en: "{fone} FONE were sent to your wallet.",
    es: "{fone} FONE fueron enviados a tu billetera.",
  },
  notif_welcome_title: { pt: "Bem-vindo(a) ao EcoVerify! 🌱", en: "Welcome to EcoVerify! 🌱", es: "¡Bienvenido(a) a EcoVerify! 🌱" },
  notif_welcome_msg: {
    pt: "Escolha uma missão, realize a ação e envie sua comprovação.",
    en: "Pick a mission, complete it and submit your proof.",
    es: "Elige una misión, realízala y envía tu comprobante.",
  },
  mark_all_read: { pt: "Marcar todas como lidas", en: "Mark all as read", es: "Marcar todas como leídas" },
  // Profile / wallet
  level: { pt: "Nível", en: "Level", es: "Nivel" },
  fone_received: { pt: "FONE recebido", en: "FONE received", es: "FONE recibido" },
  fone_pending: { pt: "FONE a receber", en: "FONE pending", es: "FONE por recibir" },
  approved_actions: { pt: "Ações aprovadas", en: "Approved actions", es: "Acciones aprobadas" },
  wallet_label: { pt: "Carteira FONE", en: "FONE wallet", es: "Billetera FONE" },
  wallet_demo_note_verify: {
    pt: "Cole o endereço da sua Fone Wallet (64 caracteres começando com \"f\"). Depois, envie o valor indicado para o endereço de verificação: assim confirmamos que a carteira é sua.",
    en: "Paste your Fone Wallet address (64 characters starting with \"f\"). Then send the amount shown to the verification address: that's how we confirm the wallet is yours.",
    es: "Pega la dirección de tu Fone Wallet (64 caracteres empezando con \"f\"). Luego envía el monto indicado a la dirección de verificación: así confirmamos que la billetera es tuya.",
  },
  wallet_simulate: {
    pt: "Já enviei — verificar",
    en: "I've sent it — verify",
    es: "Ya lo envié — verificar",
  },
  wallet_fill_example: { pt: "Usar endereço de exemplo", en: "Use sample address", es: "Usar dirección de ejemplo" },
  notif_wallet_title: { pt: "Carteira verificada ✅", en: "Wallet verified ✅", es: "Billetera verificada ✅" },
  notif_wallet_msg: {
    pt: "Sua carteira FONE foi verificada. Suas recompensas em FONE serão enviadas para ela.",
    en: "Your FONE wallet was verified. Your FONE rewards will be sent to it.",
    es: "Tu billetera FONE fue verificada. Tus recompensas en FONE se enviarán a ella.",
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
  suspended_label: { pt: "SUSPENSO", en: "SUSPENDED", es: "SUSPENDIDO" },
  payout_account_restricted: {
    pt: "Conta suspensa ou bloqueada: o FONE fica congelado (guardado) até a situação ser resolvida.",
    en: "Account suspended or blocked: FONE stays frozen (kept) until this is resolved.",
    es: "Cuenta suspendida o bloqueada: el FONE queda congelado (guardado) hasta que se resuelva.",
  },
  ban_reason_prompt: { pt: "Motivo do banimento:", en: "Ban reason:", es: "Motivo del bloqueo:" },
  reward_pending: { pt: "Pendente", en: "Pending", es: "Pendiente" },
  reward_paid: { pt: "Pago", en: "Paid", es: "Pagado" },
  simulate_payment: {
    pt: "Pagar agora",
    en: "Pay now",
    es: "Pagar ahora",
  },
  no_wallet_warning: { pt: "Usuário sem carteira verificada", en: "User has no verified wallet", es: "Usuario sin billetera verificada" },
  no_rewards: { pt: "Nenhuma recompensa ainda.", en: "No rewards yet.", es: "Aún no hay recompensas." },
  you: { pt: "você", en: "you", es: "tú" },
  // Community
  community_citizens_only: {
    pt: "O chat da comunidade é para quem participa das missões. A conta de administração não entra no chat.",
    en: "The community chat is for people who take part in missions. The admin account doesn't join the chat.",
    es: "El chat de la comunidad es para quienes participan en las misiones. La cuenta de administración no entra al chat.",
  },
  message_deleted: { pt: "Mensagem apagada", en: "Message deleted", es: "Mensaje eliminado" },
  // Register
  more: { pt: "Mais", en: "More", es: "Más" },
  have_demo_profiles: { pt: "Usar um perfil pronto", en: "Use a ready-made profile", es: "Usar un perfil listo" },
  // Account & LGPD
  deleted_account_name: { pt: "Conta excluída", en: "Deleted account", es: "Cuenta eliminada" },
  demo_account_deleted: {
    pt: "Conta excluída. Para recriá-la, use \"Restaurar dados iniciais\" em Configurações.",
    en: "Account deleted. To bring it back, use \"Restore initial data\" in Settings.",
    es: "Cuenta eliminada. Para recrearla, usa \"Restaurar datos iniciales\" en Configuración.",
  },
  // Real AI with the tester's own Gemini key (byok.ts)
  byok_title: { pt: "IA de verdade (sua chave do Gemini)", en: "Real AI (your Gemini key)", es: "IA de verdad (tu clave de Gemini)" },
  byok_intro: {
    pt: "Sem chave, a análise das fotos é simulada. Com a sua chave gratuita do Google AI Studio, as fotos da câmera ou da galeria passam a ser analisadas pelo Gemini de verdade.",
    en: "Without a key, the photo analysis is simulated. With your free Google AI Studio key, camera and gallery photos are analysed by the real Gemini.",
    es: "Sin clave, el análisis de las fotos es simulado. Con tu clave gratuita de Google AI Studio, las fotos de la cámara o la galería las analiza el Gemini de verdad.",
  },
  byok_status_off: { pt: "IA simulada", en: "Simulated AI", es: "IA simulada" },
  byok_status_on: { pt: "Gemini ativo", en: "Gemini active", es: "Gemini activo" },
  byok_label: { pt: "Chave da API do Gemini", en: "Gemini API key", es: "Clave de la API de Gemini" },
  byok_get_key: { pt: "Pegar uma chave grátis no Google AI Studio", en: "Get a free key in Google AI Studio", es: "Obtener una clave gratis en Google AI Studio" },
  byok_save: { pt: "Salvar e testar", en: "Save and test", es: "Guardar y probar" },
  byok_test: { pt: "Testar chave", en: "Test key", es: "Probar clave" },
  byok_remove: { pt: "Remover chave deste aparelho", en: "Remove key from this device", es: "Quitar la clave de este dispositivo" },
  byok_show: { pt: "Mostrar", en: "Show", es: "Mostrar" },
  byok_hide: { pt: "Ocultar", en: "Hide", es: "Ocultar" },
  byok_saved_as: { pt: "Chave salva: {key}", en: "Saved key: {key}", es: "Clave guardada: {key}" },
  byok_bad_format: {
    pt: "Isso não parece uma chave do Gemini (as chaves novas começam com \"AQ.\"; as antigas, com \"AIza\").",
    en: "This doesn't look like a Gemini key (new keys start with \"AQ.\"; older ones with \"AIza\").",
    es: "Esto no parece una clave de Gemini (las nuevas empiezan con \"AQ.\"; las antiguas, con \"AIza\").",
  },
  byok_checking: { pt: "Testando a chave…", en: "Testing the key…", es: "Probando la clave…" },
  byok_ok: { pt: "Chave funcionando ✓ Fotos reais serão analisadas pelo Gemini.", en: "Key working ✓ Real photos will be analysed by Gemini.", es: "Clave funcionando ✓ Las fotos reales las analizará Gemini." },
  byok_err_invalid_key: { pt: "O Google recusou a chave. Confira se copiou inteira ou crie outra.", en: "Google rejected the key. Check that you copied all of it or create another one.", es: "Google rechazó la clave. Revisa que la copiaste entera o crea otra." },
  byok_err_quota: { pt: "Limite gratuito do Gemini atingido. Tente mais tarde (o limite renova todo dia).", en: "Gemini free limit reached. Try again later (it resets every day).", es: "Se alcanzó el límite gratuito de Gemini. Intenta más tarde (se renueva cada día)." },
  byok_err_network: { pt: "Sem conexão com o Google. A IA de verdade precisa de internet.", en: "No connection to Google. The real AI needs internet.", es: "Sin conexión con Google. La IA de verdad necesita internet." },
  byok_err_other: { pt: "O Gemini não respondeu direito agora.", en: "Gemini did not answer properly right now.", es: "Gemini no respondió bien ahora." },
  byok_saved_anyway: { pt: "A chave foi salva assim mesmo; teste de novo depois.", en: "The key was saved anyway; test it again later.", es: "La clave se guardó igual; pruébala de nuevo después." },
  byok_removed: { pt: "Chave removida deste aparelho.", en: "Key removed from this device.", es: "Clave quitada de este dispositivo." },
  byok_safety_title: { pt: "Antes de usar", en: "Before you use it", es: "Antes de usar" },
  byok_safety_1: {
    pt: "A chave fica só neste aparelho (não vai para o EcoVerify, nem para o GitHub, nem para o \"Exportar meus dados\"). Remova-a se o aparelho for de outra pessoa.",
    en: "The key stays only on this device (it doesn't go to EcoVerify, GitHub or \"Export my data\"). Remove it if the device belongs to someone else.",
    es: "La clave queda solo en este dispositivo (no va a EcoVerify, ni a GitHub, ni a \"Exportar mis datos\"). Quítala si el dispositivo es de otra persona.",
  },
  byok_safety_2: {
    pt: "Ao enviar uma comprovação, a foto (reduzida e sem localização) e o relato vão direto deste aparelho para o Google. No plano gratuito, o Google pode usar esse conteúdo para melhorar os modelos: evite fotos com rostos ou dados pessoais.",
    en: "When you send a proof, the photo (downscaled, without location) and the report go straight from this device to Google. On the free tier Google may use that content to improve its models: avoid photos with faces or personal data.",
    es: "Al enviar un comprobante, la foto (reducida y sin ubicación) y el relato van directo de este dispositivo a Google. En el plan gratuito, Google puede usar ese contenido para mejorar sus modelos: evita fotos con rostros o datos personales.",
  },
  byok_safety_3: {
    pt: "Use uma chave só para testes, sem cobrança ativada. Nunca coloque a chave no código, no GitHub ou em grupos.",
    en: "Use a test-only key without billing enabled. Never put the key in code, on GitHub or in group chats.",
    es: "Usa una clave solo para pruebas, sin facturación activada. Nunca pongas la clave en el código, en GitHub o en grupos.",
  },
  byok_submit_hint: {
    pt: "🤖 Esta foto será analisada pelo Gemini de verdade (sua chave). A foto e o relato vão para o Google.",
    en: "🤖 This photo will be analysed by the real Gemini (your key). The photo and the report go to Google.",
    es: "🤖 Esta foto la analizará el Gemini de verdad (tu clave). La foto y el relato van a Google.",
  },
  byok_submit_setup: {
    pt: "Quer testar a IA de verdade? Cole sua chave do Gemini em Configurações.",
    en: "Want to try the real AI? Paste your Gemini key in Settings.",
    es: "¿Quieres probar la IA de verdad? Pega tu clave de Gemini en Configuración.",
  },
  byok_analyzing: { pt: "Analisando com o Gemini…", en: "Analysing with Gemini…", es: "Analizando con Gemini…" },
  byok_failed_to_moderation: {
    pt: "{reason} A comprovação foi enviada para a moderação.",
    en: "{reason} The proof was sent to the moderators.",
    es: "{reason} El comprobante se envió a la moderación.",
  },
  ai_source_simulated: { pt: "IA simulada", en: "Simulated AI", es: "IA simulada" },
  ai_source_gemini: { pt: "Gemini (chave de teste)", en: "Gemini (test key)", es: "Gemini (clave de prueba)" },
  metric_people_active: {
    pt: "Pessoas com ações aprovadas",
    en: "People with approved actions",
    es: "Personas con acciones aprobadas",
  },
  metric_perks_redeemed: {
    pt: "Benefícios resgatados",
    en: "Perks redeemed",
    es: "Beneficios canjeados",
  },
  demo_osm_note_free: {
    pt: "Criamos missões sugeridas perto do centro da cidade (praias, parques e pontos de coleta). Elas já dão pontos; a equipe revisa cada uma depois.",
    en: "We create suggested missions near the city centre (beaches, parks and collection points). They give points right away; the team reviews each one later.",
    es: "Creamos misiones sugeridas cerca del centro de la ciudad (playas, parques y puntos de recolección). Ya dan puntos; el equipo revisa cada una después.",
  },
  demo_role_citizen_desc_free: {
    pt: "Faz missões, envia comprovações, ganha pontos e resgata benefícios",
    en: "Completes missions, submits proof, earns points and redeems perks",
    es: "Hace misiones, envía comprobantes, gana puntos y canjea beneficios",
  },
  demo_role_admin_desc_free: {
    pt: "Cria missões, gerencia usuários, benefícios e dados de impacto",
    en: "Creates missions, manages users, perks and impact data",
    es: "Crea misiones, gestiona usuarios, beneficios y datos de impacto",
  },
} satisfies Record<string, Record<Lang, string>>;

export type DemoKey = keyof typeof demoDict;
/** Read-only view of the APK dictionary (tests check that every key has pt/en/es). */
export const DEMO_DICT: Readonly<Record<DemoKey, Partial<Record<Lang, string>>>> = demoDict;

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
