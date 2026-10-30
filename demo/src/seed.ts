import type { ChatMessage, DemoInvoice, DemoOffer, DemoRedemption, DemoOrg, DemoOrgMember, Mission, Notification, Reward, State, Submission, User } from "./store";
import { placeholderPhoto } from "./media";
import type { Material } from "@/lib/impact";

/** Initial data of the offline demo. Missions match scripts/seed.ts (Recife). */

/** Bump when the stored shape changes: old demo data is replaced by a fresh seed. */
export const STATE_VERSION = 10;

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

export const DEMO_IDS = {
  citizen: "u-citizen",
  moderator: "u-moderator",
  admin: "u-admin",
} as const;

function person(partial: Partial<User> & Pick<User, "id" | "name" | "email">): User {
  return {
    role: "citizen",
    totalPoints: 0,
    walletAddress: null,
    pendingWallet: null,
    adultDeclaredAt: null,
    isBanned: false,
    banReason: null,
    createdAt: ago(30 * DAY),
    language: "pt",
    fontSize: "medium",
    highContrast: false,
    reducedMotion: false,
    notificationsEnabled: true,
    ...partial,
    termsAcceptedAt: partial.termsAcceptedAt ?? partial.createdAt ?? ago(30 * DAY),
  };
}

export function createSeed(): State {
  const users: User[] = [
    person({
      id: DEMO_IDS.citizen,
      name: "Maria Cidadã",
      email: "cidada@ecoverify.dev",
      totalPoints: 70,
      walletAddress: "f30877432d1026706d7e805da846a32c3bb81e3c29b62179273c8eb5bb682575",
      isDemoProfile: true,
      createdAt: ago(20 * DAY),
    }),
    person({ id: DEMO_IDS.moderator, name: "Carlos Moderador", email: "moderador@ecoverify.dev", role: "moderator", isDemoProfile: true }),
    person({ id: DEMO_IDS.admin, name: "Ana Admin", email: "admin@ecoverify.dev", role: "admin", isDemoProfile: true, createdAt: ago(60 * DAY) }),
    person({ id: "u-bot-1", name: "João Silva", email: "joao@exemplo.dev", totalPoints: 340, walletAddress: "fec87a171ac826a6fce48478dcb74f21345d2cce8038a39d5e0853964b50af03", isBot: true }),
    person({ id: "u-bot-2", name: "Luana Costa", email: "luana@exemplo.dev", totalPoints: 260, walletAddress: "fb971722f244f58d669cbee3772a077021721a278f64f7fd633dbdde131ca376", isBot: true }),
    person({ id: "u-bot-3", name: "Pedro Albuquerque", email: "pedro@exemplo.dev", totalPoints: 180, walletAddress: "f6e4d58e72e310275dff6c15c0c8e9df469611a11f5125227c3712da86a78c49", isBot: true }),
    person({ id: "u-bot-4", name: "Beatriz Lima", email: "beatriz@exemplo.dev", totalPoints: 95, walletAddress: "fea20e32684b27b95e909348334896a68f812d810a485ed03241b4d419b1b673", isBot: true }),
    person({ id: "u-bot-5", name: "Rafael Souza", email: "rafael@exemplo.dev", totalPoints: 45, isBot: true }),
  ];

  const missions: Mission[] = [
    {
      id: "m-boa-viagem",
      scope: "local",
      city: "Recife",
      stateCode: "PE",
      title: "Mutirão de limpeza na Praia de Boa Viagem",
      titleEn: "Beach cleanup at Boa Viagem",
      titleEs: "Limpieza de la playa de Boa Viagem",
      description: "Recolha pelo menos um saco de resíduos na faixa de areia e descarte corretamente.",
      descriptionEn: "Collect at least one bag of waste from the sand and dispose of it properly.",
      descriptionEs: "Recoge al menos una bolsa de residuos en la arena y deséchala correctamente.",
      context: "Leve luvas e sacos. Fotografe o material recolhido com a praia ao fundo.",
      impact: "Resíduos plásticos na praia acabam no mar e afetam tartarugas e peixes.",
      latitude: -8.1196,
      longitude: -34.8956,
      category: "cleanup",
      pointsReward: 50,
      foneReward: "25.00",
      isActive: true,
      createdAt: ago(40 * DAY),
    },
    {
      id: "m-jaqueira",
      scope: "local",
      city: "Recife",
      stateCode: "PE",
      title: "Plantio de muda no Parque da Jaqueira",
      titleEn: "Plant a seedling at Jaqueira Park",
      titleEs: "Plantar un plantón en el Parque da Jaqueira",
      description: "Participe da ação de plantio e registre a muda plantada.",
      descriptionEn: "Join the planting action and record the planted seedling.",
      descriptionEs: "Participa en la acción de plantación y registra el plantón.",
      context: "Plante a muda em área autorizada e fotografe com a placa de identificação.",
      impact: "Árvores reduzem ilhas de calor e melhoram a qualidade do ar no Recife.",
      latitude: -8.0376,
      longitude: -34.9035,
      category: "planting",
      pointsReward: 80,
      foneReward: "40.00",
      isActive: true,
      createdAt: ago(40 * DAY),
    },
    {
      id: "m-marco-zero",
      scope: "local",
      city: "Recife",
      stateCode: "PE",
      title: "Entrega de recicláveis no Marco Zero",
      titleEn: "Drop off recyclables at Marco Zero",
      titleEs: "Entrega de reciclables en el Marco Zero",
      description: "Separe recicláveis em casa e entregue no ponto de coleta seletiva.",
      descriptionEn: "Sort recyclables at home and drop them off at the collection point.",
      descriptionEs: "Separa reciclables en casa y entrégalos en el punto de recolección.",
      context: "Fotografe o material separado no ponto de coleta.",
      impact: "A reciclagem gera renda para cooperativas de catadores e reduz o lixo em aterros.",
      latitude: -8.0631,
      longitude: -34.8711,
      category: "recycling",
      pointsReward: 30,
      foneReward: "15.00",
      isActive: true,
      createdAt: ago(40 * DAY),
    },
    {
      id: "m-dona-lindu",
      scope: "local",
      city: "Recife",
      stateCode: "PE",
      title: "Doação de roupas no Parque Dona Lindu",
      titleEn: "Clothing donation at Dona Lindu Park",
      titleEs: "Donación de ropa en el Parque Dona Lindu",
      description: "Doe roupas em bom estado na campanha de arrecadação.",
      descriptionEn: "Donate clothes in good condition to the collection campaign.",
      descriptionEs: "Dona ropa en buen estado en la campaña de recolección.",
      context: "Fotografe a entrega no ponto de arrecadação.",
      impact: "Reaproveitar roupas reduz o descarte têxtil e ajuda famílias da comunidade.",
      latitude: -8.1366,
      longitude: -34.9008,
      category: "donation",
      pointsReward: 40,
      foneReward: "20.00",
      isActive: true,
      createdAt: ago(40 * DAY),
    },
    {
      id: "m-capibaribe",
      scope: "local",
      city: "Recife",
      stateCode: "PE",
      title: "Limpeza às margens do Capibaribe",
      titleEn: "Capibaribe riverbank cleanup",
      titleEs: "Limpieza en las orillas del Capibaribe",
      description: "Recolha resíduos às margens do rio na Rua da Aurora e separe o que for reciclável.",
      descriptionEn: "Pick up waste along the river on Rua da Aurora and sort what can be recycled.",
      descriptionEs: "Recoge residuos en la orilla del río en la Rua da Aurora y separa lo reciclable.",
      context: "Use luvas, não entre na água e fotografe os sacos recolhidos com o rio ao fundo.",
      impact: "O lixo das margens chega ao mar pelo rio e entope a drenagem nas chuvas.",
      latitude: -8.0597,
      longitude: -34.8796,
      category: "cleanup",
      pointsReward: 60,
      foneReward: "30.00",
      isActive: true,
      createdAt: ago(10 * DAY),
    },
    {
      id: "m-olinda-oleo",
      scope: "local",
      city: "Olinda",
      stateCode: "PE",
      title: "Coleta de óleo de cozinha em Olinda",
      titleEn: "Cooking oil collection in Olinda",
      titleEs: "Recolección de aceite de cocina en Olinda",
      description: "Junte óleo de cozinha usado em garrafa PET e entregue no ponto de coleta do Alto da Sé.",
      descriptionEn: "Store used cooking oil in a PET bottle and deliver it to the Alto da Sé collection point.",
      descriptionEs: "Junta aceite de cocina usado en una botella PET y entrégalo en el punto del Alto da Sé.",
      context: "Fotografe a garrafa no ponto de coleta.",
      impact: "Um litro de óleo pode contaminar até 25 mil litros de água.",
      latitude: -8.0137,
      longitude: -34.8553,
      category: "recycling",
      pointsReward: 35,
      foneReward: "18.00",
      isActive: true,
      createdAt: ago(5 * DAY),
    },
    // Can be done from home: shown in every region, no distance check.
    {
      id: "m-casa-reciclaveis",
      scope: "anywhere",
      title: "Separe o lixo reciclável em casa",
      titleEn: "Sort recyclables at home",
      titleEs: "Separa los reciclables en casa",
      description: "Monte um ponto de separação em casa (plástico, papel, metal e vidro) e mostre os recicláveis limpos e separados.",
      descriptionEn: "Set up a sorting spot at home (plastic, paper, metal and glass) and show the clean, sorted recyclables.",
      descriptionEs: "Arma un punto de separación en casa (plástico, papel, metal y vidrio) y muestra los reciclables limpios y separados.",
      context: "Fotografe os recicláveis limpos e separados por tipo (sacolas, caixas ou lixeiras diferentes).",
      impact: "Material limpo e separado vale mais para as cooperativas de catadores e não vai para o aterro.",
      latitude: -8.0476,
      longitude: -34.877,
      category: "recycling",
      pointsReward: 20,
      foneReward: "5.00",
      isActive: true,
      createdAt: ago(3 * DAY),
    },
    {
      id: "m-casa-oleo",
      scope: "anywhere",
      sponsorName: "Cooperativa Recicla PE (exemplo)",
      sponsorId: "sp-recicla",
      title: "Guarde o óleo de cozinha usado",
      titleEn: "Store used cooking oil",
      titleEs: "Guarda el aceite de cocina usado",
      description: "Em vez de jogar na pia, guarde o óleo usado frio numa garrafa PET fechada para levar a um ponto de coleta.",
      descriptionEn: "Instead of pouring it down the sink, store cold used oil in a closed PET bottle to take to a collection point.",
      descriptionEs: "En lugar de tirarlo al fregadero, guarda el aceite usado frío en una botella PET cerrada para llevarlo a un punto de recolección.",
      context: "Fotografe a garrafa PET fechada com o óleo usado.",
      impact: "Um litro de óleo pode contaminar milhares de litros de água e entupir a rede de esgoto.",
      latitude: -8.0476,
      longitude: -34.877,
      category: "recycling",
      pointsReward: 15,
      foneReward: "3.00",
      isActive: true,
      createdAt: ago(2 * DAY),
    },
  ];

  const sub = (s: Omit<Submission, "photoHash" | "accuracy" | "simulatedLocation" | "latitude" | "longitude"> & { at: Mission }): Submission => {
    const { at, ...rest } = s;
    return {
      ...rest,
      photoHash: `seed-${s.id}`,
      latitude: at.latitude + 0.0002,
      longitude: at.longitude - 0.0001,
      accuracy: 12,
      simulatedLocation: false,
    };
  };
  const [boaViagem, jaqueira, marcoZero, donaLindu, capibaribe] = missions;
  const olindaOleo = missions.find((m) => m.id === "m-olinda-oleo") ?? marcoZero;
  /** Approved deliveries of the example people in the last months (no FONE: already paid out before the demo). */
  const impactHistory = (): Submission[] => {
    const entries: [string, Mission, Material, number, number][] = [
      ["u-bot-1", marcoZero, "plastic", 6.0, 20],
      ["u-bot-2", marcoZero, "paper", 8.5, 34],
      ["u-bot-3", marcoZero, "glass", 5.0, 47],
      ["u-bot-5", marcoZero, "plastic", 3.0, 15],
      ["u-bot-1", olindaOleo, "oil", 2.0, 52],
      ["u-bot-2", olindaOleo, "oil", 1.5, 70],
      ["u-bot-4", olindaOleo, "oil", 3.0, 25],
    ];
    return entries.map(([userId, mission, material, kg, days]) =>
      sub({
        id: `s-hist-${userId}-${mission.id}`,
        userId,
        missionId: mission.id,
        at: mission,
        photo: placeholderPhoto(material === "oil" ? "🛢️" : "♻️", "#2dd4bf", "#0f766e", "Entrega de recicláveis"),
        report: "Separei o material em casa ao longo das semanas e entreguei no ponto de coleta indicado na missão, com foto no local.",
        material,
        weightKg: kg,
        declaredWeightKg: kg,
        status: "approved",
        reviewedBy: DEMO_IDS.moderator,
        rejectionReason: null,
        submittedAt: ago(days * DAY + 3 * 60 * 60 * 1000),
        reviewedAt: ago(days * DAY),
      }),
    );
  };

  const submissions: Submission[] = [
    // Waiting for moderation (log in as moderator to review them)
    sub({
      id: "s-luana-praia",
      userId: "u-bot-2",
      missionId: boaViagem.id,
      at: boaViagem,
      photo: placeholderPhoto("🧹", "#38bdf8", "#2563eb", "3 sacos recolhidos na areia"),
      report: "Fui com minha irmã no fim da tarde e recolhemos três sacos de lixo, principalmente copos plásticos e tampinhas perto do posto 7.",
      status: "pending",
      reviewedBy: null,
      rejectionReason: null,
      submittedAt: ago(3 * 60 * 60 * 1000),
      reviewedAt: null,
    }),
    sub({
      id: "s-pedro-jaqueira",
      userId: "u-bot-3",
      missionId: jaqueira.id,
      at: jaqueira,
      photo: placeholderPhoto("🌳", "#34d399", "#059669", "Muda de ipê plantada"),
      report: "Plantei uma muda de ipê-amarelo na área indicada pela equipe do parque, ao lado da placa de identificação número 12.",
      status: "pending",
      reviewedBy: null,
      rejectionReason: null,
      submittedAt: ago(5 * 60 * 60 * 1000),
      reviewedAt: null,
    }),
    sub({
      id: "s-beatriz-marco",
      userId: "u-bot-4",
      missionId: marcoZero.id,
      at: marcoZero,
      photo: placeholderPhoto("♻️", "#2dd4bf", "#0d9488", "Recicláveis separados"),
      report: "Separei garrafas PET, latinhas e papelão durante a semana e entreguei tudo no ponto de coleta seletiva do Marco Zero.",
      material: "plastic",
      weightKg: 4.5,
      declaredWeightKg: 4.5,
      status: "pending",
      reviewedBy: null,
      rejectionReason: null,
      submittedAt: ago(26 * 60 * 60 * 1000),
      reviewedAt: null,
    }),
    // History of the demo citizen
    sub({
      id: "s-maria-marco",
      userId: DEMO_IDS.citizen,
      missionId: marcoZero.id,
      at: marcoZero,
      photo: placeholderPhoto("♻️", "#2dd4bf", "#0f766e", "Garrafas e latinhas"),
      report: "Juntei as garrafas e latinhas lá de casa durante duas semanas e levei ao ponto de coleta do Marco Zero no domingo.",
      material: "metal",
      weightKg: 2.5,
      declaredWeightKg: 2.5,
      status: "approved",
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: null,
      submittedAt: ago(12 * DAY),
      reviewedAt: ago(11 * DAY),
    }),
    sub({
      id: "s-maria-lindu",
      userId: DEMO_IDS.citizen,
      missionId: donaLindu.id,
      at: donaLindu,
      photo: placeholderPhoto("🤝", "#fbbf24", "#f97316", "Sacola de roupas doadas"),
      report: "Doei duas sacolas de roupas infantis em bom estado na campanha de arrecadação do Parque Dona Lindu neste sábado.",
      status: "approved",
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: null,
      submittedAt: ago(9 * DAY),
      reviewedAt: ago(8 * DAY),
    }),
    sub({
      id: "s-maria-capibaribe",
      userId: DEMO_IDS.citizen,
      missionId: capibaribe.id,
      at: capibaribe,
      photo: placeholderPhoto("🧹", "#94a3b8", "#475569", "Foto escura"),
      report: "Recolhi lixo na margem do rio perto da ponte, mas a foto ficou escura porque já estava anoitecendo quando terminei.",
      status: "rejected",
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: "A foto não mostra os resíduos recolhidos. Envie uma nova foto com os sacos e o rio ao fundo.",
      submittedAt: ago(6 * DAY),
      reviewedAt: ago(5 * DAY),
    }),
    // Other approved actions (feed the rewards panel)
    sub({
      id: "s-joao-jaqueira",
      userId: "u-bot-1",
      missionId: jaqueira.id,
      at: jaqueira,
      photo: placeholderPhoto("🌳", "#4ade80", "#15803d", "Mutirão de plantio"),
      report: "Participei do mutirão de plantio do sábado e plantei duas mudas de pau-brasil junto com o pessoal da associação.",
      status: "approved",
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: null,
      submittedAt: ago(9 * DAY),
      reviewedAt: ago(8 * DAY),
    }),
    sub({
      id: "s-rafael-praia",
      userId: "u-bot-5",
      missionId: boaViagem.id,
      at: boaViagem,
      photo: placeholderPhoto("🧹", "#7dd3fc", "#0284c7", "Saco de lixo cheio"),
      report: "Fiz uma caminhada na orla recolhendo lixo e enchi um saco grande com plástico, isopor e bitucas de cigarro.",
      status: "approved",
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: null,
      submittedAt: ago(2 * DAY),
      reviewedAt: ago(1 * DAY),
    }),
    // Older history: feeds Admin → Reciclagem and Admin → Dados (anonymous aggregates need 5+ people).
    ...impactHistory(),
  ];

  const rewards: Reward[] = [
    { id: "r-maria-marco", userId: DEMO_IDS.citizen, submissionId: "s-maria-marco", foneAmount: "15.00", status: "paid", txHash: "demo-7c1e0b5d9a2f4e8c3b6a1d0f9e8c7b6a5d4c3b2a1f0e9d8c7b6a5d4c", createdAt: ago(11 * DAY), paidAt: ago(10 * DAY) },
    // Past the 7-day hold period: Ana can pay it right away. Rafael's reward is still in the hold period.
    { id: "r-maria-lindu", userId: DEMO_IDS.citizen, submissionId: "s-maria-lindu", foneAmount: "20.00", status: "pending", txHash: null, createdAt: ago(8 * DAY), paidAt: null },
    { id: "r-joao-jaqueira", userId: "u-bot-1", submissionId: "s-joao-jaqueira", foneAmount: "40.00", status: "paid", txHash: "demo-2b9d7f1a3c5e8b0d4f6a2c9e1b7d3f5a8c0e6b2d4f9a1c3e5b7d0f2a", createdAt: ago(8 * DAY), paidAt: ago(7 * DAY) },
    { id: "r-rafael-praia", userId: "u-bot-5", submissionId: "s-rafael-praia", foneAmount: "25.00", status: "pending", txHash: null, createdAt: ago(1 * DAY), paidAt: null },
  ];

  const chat: ChatMessage[] = [
    { id: "c1", userId: "u-bot-1", message: "Bom dia, pessoal! 🌞 Alguém vai no mutirão da Jaqueira no sábado?", replyToId: null, deleted: false, createdAt: ago(2 * DAY) },
    { id: "c2", userId: "u-bot-2", message: "Eu vou! Levo luvas extras pra quem precisar 🧤", replyToId: "c1", deleted: false, createdAt: ago(2 * DAY - 20 * 60 * 1000) },
    { id: "c3", userId: "u-bot-3", message: "Dica: no Marco Zero o ponto de coleta fica do lado do centro de artesanato ♻️", replyToId: null, deleted: false, createdAt: ago(1 * DAY) },
    { id: "c4", userId: "u-bot-4", message: "Valeu, Pedro! Entreguei meus recicláveis lá ontem.", replyToId: "c3", deleted: false, createdAt: ago(1 * DAY - 60 * 60 * 1000) },
    { id: "c5", userId: "u-bot-5", message: "Primeira missão aprovada! Bora subir no ranking 💪🌱", replyToId: null, deleted: false, createdAt: ago(6 * 60 * 60 * 1000) },
  ];

  /* SaaS: a school on a free trial (Carlos runs it, Maria takes part) and a paying company. */
  const school: DemoOrg = {
    id: "org-escola",
    name: "Escola Técnica Exemplo",
    slug: "escola-tecnica-exemplo",
    type: "school",
    city: "Recife",
    plan: "school",
    billingCycle: "monthly",
    subscriptionStatus: "trialing",
    currentPeriodEnd: new Date(Date.now() + 9 * DAY).toISOString(),
    trialUsed: true,
    inviteCode: "ESCOLA24",
    ownerId: DEMO_IDS.moderator,
    createdAt: ago(5 * DAY),
  };
  const company: DemoOrg = {
    id: "org-recicla",
    name: "Recicla Boa Viagem (exemplo)",
    slug: "recicla-boa-viagem",
    type: "business",
    city: "Recife",
    plan: "business",
    billingCycle: "monthly",
    subscriptionStatus: "active",
    currentPeriodEnd: new Date(Date.now() + 18 * DAY).toISOString(),
    trialUsed: true,
    inviteCode: "RECICLA7",
    ownerId: "u-bot-1",
    createdAt: ago(45 * DAY),
  };
  const orgMember = (orgId: string, userId: string, role: DemoOrgMember["role"], days: number): DemoOrgMember => ({
    id: `om-${orgId}-${userId}`,
    orgId,
    userId,
    role,
    joinedAt: ago(days * DAY),
  });
  const orgMembers: DemoOrgMember[] = [
    orgMember(school.id, DEMO_IDS.moderator, "owner", 5),
    orgMember(school.id, DEMO_IDS.citizen, "member", 4),
    orgMember(school.id, "u-bot-2", "member", 4),
    orgMember(school.id, "u-bot-3", "member", 3),
    orgMember(school.id, "u-bot-4", "member", 3),
    orgMember(company.id, "u-bot-1", "owner", 45),
    orgMember(company.id, "u-bot-5", "member", 40),
  ];
  const orgMission = (id: string, title: string, description: string, category: Mission["category"], points: number, days: number): Mission => ({
    id,
    title,
    description,
    category,
    pointsReward: points,
    foneReward: "0.00",
    latitude: -8.0476,
    longitude: -34.877,
    scope: "anywhere",
    city: "Recife",
    stateCode: "PE",
    isActive: true,
    createdAt: ago(days * DAY),
    organizationId: school.id,
  });
  const schoolMissions = [
    orgMission("m-org-pilhas", "Coleta de pilhas e baterias", "Traga pilhas usadas para a caixa de coleta da escola (bloco B) e fotografe a entrega.", "recycling", 30, 5),
    orgMission("m-org-horta", "Cuide da horta da escola", "Regue, retire ervas daninhas ou plante uma muda na horta da escola. Foto mostrando o canteiro.", "planting", 40, 5),
    orgMission("m-org-garrafa", "Semana da garrafa reutilizável", "Use sua garrafa reutilizável em vez de copos descartáveis durante a semana. Foto com a garrafa na escola.", "other", 20, 2),
  ];
  missions.push(...schoolMissions);
  const orgSub = (id: string, userId: string, mission: Mission, days: number, emoji: string, caption: string): Submission =>
    sub({
      id,
      userId,
      missionId: mission.id,
      at: mission,
      photo: placeholderPhoto(emoji, "#34d399", "#0d9488", caption),
      report: `${caption}. Atividade feita na escola junto com a turma, conforme as instruções da missão.`,
      status: "approved",
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: null,
      submittedAt: ago(days * DAY + 3600000),
      reviewedAt: ago(days * DAY),
      decidedBy: "human",
    });
  submissions.push(
    orgSub("s-org-1", "u-bot-2", schoolMissions[0], 4, "🔋", "Entreguei 12 pilhas usadas"),
    orgSub("s-org-2", "u-bot-3", schoolMissions[1], 3, "🌱", "Plantei duas mudas de alface"),
    orgSub("s-org-3", "u-bot-2", schoolMissions[1], 2, "🌱", "Reguei e limpei o canteiro 3"),
    orgSub("s-org-4", "u-bot-4", schoolMissions[0], 1, "🔋", "Trouxe as baterias do controle"),
    orgSub("s-org-5", DEMO_IDS.citizen, schoolMissions[0], 1, "🔋", "Levei as pilhas lá de casa"),
  );
  /*
   * One-off events (mutirões, docs/MONETIZACAO.md §1): a free community collective run by Maria with a
   * finished beach clean-up (report locked until the event is paid) and an upcoming one; the school
   * (paid plan, report included) has a recycling drive happening right now.
   */
  const HOUR = 3600000;
  const collective: DemoOrg = {
    id: "org-praia",
    name: "Coletivo Praia Limpa (exemplo)",
    slug: "coletivo-praia-limpa",
    type: "ngo",
    city: "Recife",
    plan: "free",
    billingCycle: "monthly",
    subscriptionStatus: "active",
    currentPeriodEnd: null,
    trialUsed: false,
    inviteCode: "PRAIA2026",
    ownerId: DEMO_IDS.citizen,
    createdAt: ago(20 * DAY),
  };
  orgMembers.push(
    orgMember(collective.id, DEMO_IDS.citizen, "owner", 20),
    ...["u-bot-1", "u-bot-2", "u-bot-3", "u-bot-4", "u-bot-5"].map((id, i) => orgMember(collective.id, id, "member", 18 - i)),
  );
  /** Event on a local day/time: `dayOffset` days from today at `hour`:00, lasting `hours`. */
  const at = (dayOffset: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };
  const eventMission = (id: string, orgId: string, title: string, description: string, category: Mission["category"], points: number, start: number, hours: number): Mission => ({
    ...orgMission(id, title, description, category, points, 6),
    organizationId: orgId,
    sponsorName: null,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + hours * HOUR).toISOString(),
  });
  const today = new Date().getDay();
  const lastSaturday = -(((today + 1) % 7) || 7);
  const nextSaturday = ((6 - today + 7) % 7) || 7;
  const beachCleanup = eventMission(
    "m-ev-praia",
    collective.id,
    "Mutirão de limpeza na praia de Boa Viagem",
    "Encontro no Posto 7. Recolha o lixo da faixa de areia e fotografe o saco cheio junto com a equipe.",
    "cleanup",
    50,
    at(lastSaturday, 7),
    4,
  );
  const parkCleanup = eventMission(
    "m-ev-jaqueira",
    collective.id,
    "Mutirão no Parque da Jaqueira",
    "Limpeza dos canteiros e do lago. Traga luvas e garrafa d'água; sacos por conta do coletivo.",
    "cleanup",
    50,
    at(nextSaturday, 8),
    4,
  );
  const schoolDrive = eventMission(
    "m-ev-feira",
    school.id,
    "Gincana de recicláveis da Feira de Ciências",
    "Traga recicláveis separados para a gincana no pátio e fotografe a entrega na mesa da sua turma.",
    "recycling",
    40,
    // Happening now: started at the top of the previous hour, ends in a few hours.
    at(0, new Date().getHours() - 1),
    5,
  );
  missions.push(beachCleanup, parkCleanup, schoolDrive);
  const beachPeople: [string, string][] = [
    ["u-bot-1", "Recolhi garrafas e tampinhas perto do Posto 7"],
    ["u-bot-2", "Dois sacos de plástico e isopor"],
    ["u-bot-3", "Bitucas de cigarro e canudos na areia"],
    ["u-bot-4", "Redes de pesca e latas perto das pedras"],
    ["u-bot-5", "Limpei a área do quiosque com a equipe"],
  ];
  submissions.push(
    ...beachPeople.map(([userId, caption], i) =>
      sub({
        id: `s-ev-praia-${i + 1}`,
        userId,
        missionId: beachCleanup.id,
        at: beachCleanup,
        photo: placeholderPhoto(["🧴", "🛍️", "🚬", "🎣", "🏖️"][i], "#38bdf8", "#2456d0", caption),
        report: `${caption}. Participei do mutirão do coletivo na praia de Boa Viagem e separei o lixo recolhido.`,
        status: "approved",
        reviewedBy: DEMO_IDS.citizen,
        rejectionReason: null,
        submittedAt: new Date(new Date(beachCleanup.startsAt!).getTime() + (i + 1) * 35 * 60000).toISOString(),
        reviewedAt: new Date(new Date(beachCleanup.endsAt!).getTime() + 2 * HOUR).toISOString(),
        decidedBy: "human",
      }),
    ),
  );
  const invoices: DemoInvoice[] = [
    { id: "inv-recicla-1", orgId: company.id, plan: "business", billingCycle: "monthly", amountCents: 34900, status: "paid", reference: "EVDEMO2K7Q9X", reportedAt: ago(12 * DAY), createdAt: ago(12 * DAY), paidAt: ago(12 * DAY) },
    { id: "inv-recicla-0", orgId: company.id, plan: "business", billingCycle: "monthly", amountCents: 34900, status: "paid", reference: "EVDEMO8M3T4R", reportedAt: ago(42 * DAY), createdAt: ago(42 * DAY), paidAt: ago(42 * DAY) },
  ];

  // Local business benefits (Benefícios): one featured 18+, one open to all ages, one locked by points.
  const offers: DemoOffer[] = [
    {
      id: "of-cafe",
      partnerName: "Café Verde do Recife (exemplo)",
      title: "Café coado grátis na compra de um bolo",
      description: "Válido de segunda a sexta, das 8h às 18h. Um por pessoa, não cumulativo com outras promoções.",
      kind: "food",
      city: "Recife",
      address: "Rua da Aurora, 300 — Boa Vista",
      minPoints: 50,
      adultsOnly: true,
      maxRedemptions: 100,
      expiresAt: null,
      featured: true,
      monthlyFeeCents: 14900,
      partnerToken: "cafeverderecifedemoparce",
      isActive: true,
      createdAt: ago(25 * DAY),
    },
    {
      id: "of-livraria",
      partnerName: "Livraria da Jaqueira (exemplo)",
      title: "15% em livros de ciência e natureza",
      description: "Mostre o código no caixa. Vale para livros das seções de ciência, natureza e infantojuvenil.",
      kind: "culture",
      city: "Recife",
      address: "Parque da Jaqueira — Rua do Futuro",
      minPoints: 30,
      adultsOnly: false,
      maxRedemptions: null,
      expiresAt: new Date(Date.now() + 60 * DAY).toISOString(),
      featured: false,
      monthlyFeeCents: 4900,
      partnerToken: "livrariajaqueirademopar2",
      isActive: true,
      createdAt: ago(18 * DAY),
    },
    {
      id: "of-bike",
      partnerName: "Bike Point Boa Viagem (exemplo)",
      title: "Revisão de bicicleta com 20% de desconto",
      description: "Revisão completa (freios, câmbio e calibragem). Agende pelo WhatsApp da loja e mostre o código.",
      kind: "bike",
      city: "Recife",
      address: "Av. Conselheiro Aguiar, 1200 — Boa Viagem",
      minPoints: 150,
      adultsOnly: true,
      maxRedemptions: 40,
      expiresAt: null,
      featured: false,
      monthlyFeeCents: 4900,
      partnerToken: "bikepointboaviagemdemo22",
      isActive: true,
      createdAt: ago(10 * DAY),
    },
  ];
  const redemptions: DemoRedemption[] = [
    { id: "rd-1", offerId: "of-cafe", userId: "u-bot-1", code: "JQ7KM4XP", createdAt: ago(9 * DAY), usedAt: ago(8 * DAY) },
    { id: "rd-2", offerId: "of-cafe", userId: "u-bot-2", code: "R8TW2ZNA", createdAt: ago(6 * DAY), usedAt: ago(5 * DAY) },
    { id: "rd-3", offerId: "of-cafe", userId: "u-bot-3", code: "HV5CE9DS", createdAt: ago(2 * DAY), usedAt: null },
    { id: "rd-4", offerId: "of-bike", userId: "u-bot-1", code: "PX3GU6WB", createdAt: ago(4 * DAY), usedAt: ago(3 * DAY) },
    { id: "rd-5", offerId: "of-livraria", userId: "u-bot-4", code: "MK8YT2QF", createdAt: ago(3 * DAY), usedAt: null },
  ];

  const notifications: Notification[] = [
    {
      id: "n-maria-lindu",
      userId: DEMO_IDS.citizen,
      title: "Comprovação aprovada! 🎉",
      message: "Sua comprovação para \"Doação de roupas no Parque Dona Lindu\" foi aprovada. Você ganhou 40 pontos e 20.00 FONE entrou na fila de pagamento.",
      isRead: false,
      createdAt: ago(8 * DAY),
    },
    {
      id: "n-maria-capibaribe",
      userId: DEMO_IDS.citizen,
      title: "Comprovação rejeitada",
      message: "Sua comprovação para \"Limpeza às margens do Capibaribe\" foi rejeitada. Motivo: A foto não mostra os resíduos recolhidos. Você pode enviar uma nova comprovação.",
      isRead: true,
      createdAt: ago(5 * DAY),
    },
  ];

  return {
    version: STATE_VERSION,
    currentUserId: null,
    guestLanguage: detectLanguage(),
    users,
    missions,
    submissions,
    rewards,
    notifications,
    chat,
    region: null,
    missionRequests: [],
    seededCities: [],
    payoutSettings: { minPayoutFone: 5, holdDays: 7, monthlyBudgetFone: 500, maxFonePerUserMonth: 100 },
    orgs: [school, company, collective],
    orgMembers,
    invoices,
    sponsors: [{ id: "sp-recicla", name: "Cooperativa Recicla PE (exemplo)", budgetFone: "30.00", isActive: true, createdAt: ago(20 * DAY) }],
    // One example yellow card, so Admin → Users shows the badge and the sheet has something.
    cards: [
      {
        id: "card-example-1",
        userId: "u-bot-5",
        type: "yellow",
        reasonCode: "internet_copy",
        note: "A foto enviada é a mesma de um site de notícias (achamos no Google Lens).",
        submissionId: null,
        issuedBy: DEMO_IDS.admin,
        createdAt: ago(12 * DAY),
        expiresAt: new Date(Date.now() + 168 * DAY).toISOString(),
        consumedAt: null,
        causedSuspension: false,
        revokedAt: null,
        appealMessage: null,
        appealedAt: null,
        appealRejectedAt: null,
      },
    ],
    moderatorsEnabled: true,
    offers,
    redemptions,
  };
}

function detectLanguage(): State["guestLanguage"] {
  const nav = (typeof navigator !== "undefined" ? navigator.language : "pt").toLowerCase();
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("en")) return "en";
  return "pt";
}
