import type { ChatMessage, DemoChatReport, DemoCheckin, DemoDump, DemoDumpConfirmation, DemoInvoice, DemoOffer, DemoPoint, DemoRedemption, DemoOrg, DemoOrgMember, Mission, Notification, Reward, State, Submission, User } from "./store";
import { placeholderPhoto } from "./media";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { COUNT_ITEM_INFO, countRule, estimatedKg } from "@/lib/proof";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { registerText } from "./seed-text";
import { CLEANUP_POINTS, cleanupMission } from "@/lib/dumps";

/** Initial data of the offline demo. Missions match scripts/seed.ts (Recife). */

/** Bump when the stored shape changes: old demo data is replaced by a fresh seed. */
export const STATE_VERSION = 18;

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

export const DEMO_IDS = {
  citizen: "u-citizen",
  moderator: "u-moderator",
  admin: "u-admin",
  /** School coordinator: a regular (citizen) account that runs an organization. */
  teacher: "u-teacher",
} as const;

function person(partial: Partial<User> & Pick<User, "id" | "name" | "email">, lang: Lang): User {
  return {
    role: "citizen",
    totalPoints: 0,
    walletAddress: null,
    pendingWallet: null,
    adultDeclaredAt: null,
    isBanned: false,
    banReason: null,
    createdAt: ago(30 * DAY),
    language: lang,
    fontSize: "medium",
    highContrast: false,
    reducedMotion: false,
    notificationsEnabled: true,
    ...partial,
    termsAcceptedAt: partial.termsAcceptedAt ?? partial.createdAt ?? ago(30 * DAY),
  };
}

type Text3 = Record<Lang, string>;

/**
 * Initial data in `lang` (English unless the person restores the data while using another language).
 * Missions and perks carry all three languages; the other texts are registered in seed-text.ts so
 * each screen shows them in the viewer's language.
 */
export function createSeed(lang: Lang = DEFAULT_LANG): State {
  // Every text is registered in the three languages so screens can show it in the viewer's language.
  const L = (text: Text3) => {
    registerText(text);
    return text[lang];
  };
  const join = (a: Text3, b: Text3): Text3 => ({ pt: `${a.pt}. ${b.pt}`, en: `${a.en}. ${b.en}`, es: `${a.es}. ${b.es}` });
  const P = (emoji: string, from: string, to: string, caption: Text3) => {
    const urls = { pt: placeholderPhoto(emoji, from, to, caption.pt), en: placeholderPhoto(emoji, from, to, caption.en), es: placeholderPhoto(emoji, from, to, caption.es) };
    registerText(urls);
    return urls[lang];
  };
  const C = (text: Text3) => ({ context: text.pt, contextEn: text.en, contextEs: text.es });
  const I = (text: Text3) => ({ impact: text.pt, impactEn: text.en, impactEs: text.es });
  const T = (text: Text3) => ({ title: text.pt, titleEn: text.en, titleEs: text.es });
  const D = (text: Text3) => ({ description: text.pt, descriptionEn: text.en, descriptionEs: text.es });
  const users: User[] = [
    person({
      id: DEMO_IDS.citizen,
      name: "Maria Santos",
      email: "cidada@ecoverify.dev",
      totalPoints: 70,
      walletAddress: "f30877432d1026706d7e805da846a32c3bb81e3c29b62179273c8eb5bb682575",
      isDemoProfile: true,
      createdAt: ago(20 * DAY),
    }, lang),
    person({ id: DEMO_IDS.moderator, name: "Carlos Mendes", email: "moderador@ecoverify.dev", role: "moderator", isDemoProfile: true }, lang),
    person({ id: DEMO_IDS.teacher, name: "Juliana Rocha", email: "escola@ecoverify.dev", isDemoProfile: true, createdAt: ago(6 * DAY) }, lang),
    person({ id: DEMO_IDS.admin, name: "Ana Ribeiro", email: "admin@ecoverify.dev", role: "admin", isDemoProfile: true, createdAt: ago(60 * DAY) }, lang),
    person({ id: "u-bot-1", name: "João Silva", email: "joao@ecoverify.dev", totalPoints: 340, walletAddress: "fec87a171ac826a6fce48478dcb74f21345d2cce8038a39d5e0853964b50af03", isBot: true }, lang),
    person({ id: "u-bot-2", name: "Luana Costa", email: "luana@ecoverify.dev", totalPoints: 260, walletAddress: "fb971722f244f58d669cbee3772a077021721a278f64f7fd633dbdde131ca376", isBot: true }, lang),
    person({ id: "u-bot-3", name: "Pedro Albuquerque", email: "pedro@ecoverify.dev", totalPoints: 180, walletAddress: "f6e4d58e72e310275dff6c15c0c8e9df469611a11f5125227c3712da86a78c49", isBot: true }, lang),
    person({ id: "u-bot-4", name: "Beatriz Lima", email: "beatriz@ecoverify.dev", totalPoints: 95, walletAddress: "fea20e32684b27b95e909348334896a68f812d810a485ed03241b4d419b1b673", isBot: true }, lang),
    person({ id: "u-bot-5", name: "Rafael Souza", email: "rafael@ecoverify.dev", totalPoints: 45, isBot: true }, lang),
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
      ...C({ pt: "Leve luvas e sacos. Tire uma foto ANTES do trecho sujo e outra DEPOIS, do mesmo lugar, com os sacos cheios.", en: "Bring gloves and bags. Take a BEFORE photo of the dirty stretch and an AFTER photo from the same spot, with the full bags.", es: "Lleva guantes y bolsas. Toma una foto ANTES del tramo sucio y otra DESPUÉS, desde el mismo lugar, con las bolsas llenas." }),
      proofType: "before_after",
      ...I({ pt: "Resíduos plásticos na praia acabam no mar e afetam tartarugas e peixes.", en: "Plastic waste on the beach ends up in the sea and harms turtles and fish.", es: "Los residuos plásticos de la playa terminan en el mar y afectan a tortugas y peces." }),
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
      ...C({ pt: "Plante a muda em área autorizada e fotografe com a placa de identificação.", en: "Plant the seedling in an authorised area and photograph it next to the identification sign.", es: "Planta el plantón en un área autorizada y fotografíalo junto a la placa de identificación." }),
      ...I({ pt: "Árvores reduzem ilhas de calor e melhoram a qualidade do ar no Recife.", en: "Trees reduce urban heat islands and improve air quality in Recife.", es: "Los árboles reducen las islas de calor y mejoran la calidad del aire en Recife." }),
      latitude: -8.0376,
      longitude: -34.9035,
      category: "planting",
      proofType: "photo",
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
      title: "Entregue 20 garrafas PET no Marco Zero",
      titleEn: "Drop off 20 PET bottles at Marco Zero",
      titleEs: "Entrega 20 botellas PET en el Marco Zero",
      description: "Junte pelo menos 20 garrafas PET vazias em casa e entregue no ponto de coleta seletiva do Marco Zero.",
      descriptionEn: "Save at least 20 empty PET bottles at home and drop them off at the Marco Zero collection point.",
      descriptionEs: "Junta al menos 20 botellas PET vacías en casa y entrégalas en el punto de recolección del Marco Zero.",
      ...C({ pt: "No ponto de coleta, espalhe as garrafas no chão sem empilhar e fotografe todas juntas antes de entregar.", en: "At the collection point, spread the bottles on the ground without stacking and photograph them all before handing them in.", es: "En el punto de recolección, extiende las botellas en el suelo sin apilar y fotografíalas todas antes de entregarlas." }),
      proofType: "count",
      countItem: "pet_bottle",
      countTarget: 20,
      ...I({ pt: "A reciclagem gera renda para cooperativas de catadores e reduz o lixo em aterros.", en: "Recycling creates income for waste-picker cooperatives and keeps waste out of landfills.", es: "El reciclaje genera ingresos para cooperativas de recicladores y reduce la basura en vertederos." }),
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
      description: "Doe pelo menos 3 peças de roupa em bom estado na campanha de arrecadação.",
      descriptionEn: "Donate at least 3 items of clothing in good condition to the collection campaign.",
      descriptionEs: "Dona al menos 3 prendas de ropa en buen estado en la campaña de recolección.",
      ...C({ pt: "No ponto de arrecadação, estenda as peças lado a lado e fotografe antes de entregar.", en: "At the donation point, lay the items side by side and photograph them before handing them in.", es: "En el punto de recolección, extiende las prendas una al lado de otra y fotografíalas antes de entregarlas." }),
      proofType: "count",
      countItem: "clothing",
      countTarget: 3,
      ...I({ pt: "Reaproveitar roupas reduz o descarte têxtil e ajuda famílias da comunidade.", en: "Reusing clothes cuts textile waste and helps families in the community.", es: "Reutilizar ropa reduce el desecho textil y ayuda a familias de la comunidad." }),
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
      ...C({ pt: "Use luvas e não entre na água. Foto ANTES do trecho e foto DEPOIS do mesmo ângulo, com os sacos recolhidos e o rio ao fundo.", en: "Wear gloves and stay out of the water. A BEFORE photo of the stretch and an AFTER photo from the same angle, with the bags and the river in the background.", es: "Usa guantes y no entres al agua. Foto ANTES del tramo y foto DESPUÉS desde el mismo ángulo, con las bolsas y el río al fondo." }),
      proofType: "before_after",
      ...I({ pt: "O lixo das margens chega ao mar pelo rio e entope a drenagem nas chuvas.", en: "Litter on the riverbanks reaches the sea through the river and clogs drains when it rains.", es: "La basura de las orillas llega al mar por el río y tapa el drenaje cuando llueve." }),
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
      description: "Encha uma garrafa PET de 2 litros com óleo de cozinha usado e entregue no ponto de coleta do Alto da Sé.",
      descriptionEn: "Fill a 2-litre PET bottle with used cooking oil and deliver it to the Alto da Sé collection point.",
      descriptionEs: "Llena una botella PET de 2 litros con aceite de cocina usado y entrégala en el punto del Alto da Sé.",
      ...C({ pt: "Fotografe a garrafa cheia e fechada no ponto de coleta.", en: "Photograph the full, closed bottle at the collection point.", es: "Fotografía la botella llena y cerrada en el punto de recolección." }),
      proofType: "count",
      countItem: "oil_bottle",
      countTarget: 1,
      ...I({ pt: "Um litro de óleo pode contaminar até 25 mil litros de água.", en: "One litre of oil can contaminate up to 25,000 litres of water.", es: "Un litro de aceite puede contaminar hasta 25 mil litros de agua." }),
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
      title: "Junte 30 latinhas de alumínio",
      titleEn: "Collect 30 aluminium cans",
      titleEs: "Junta 30 latas de aluminio",
      description: "Junte pelo menos 30 latinhas vazias e amassadas para entregar a um catador ou ponto de coleta.",
      descriptionEn: "Save at least 30 empty, crushed cans to give to a waste picker or a collection point.",
      descriptionEs: "Junta al menos 30 latas vacías y aplastadas para entregar a un reciclador o punto de recolección.",
      ...C({ pt: "Espalhe as latinhas no chão sem empilhar e fotografe todas de cima.", en: "Spread the cans on the floor without stacking and photograph them all from above.", es: "Extiende las latas en el suelo sin apilar y fotografíalas todas desde arriba." }),
      ...I({ pt: "A latinha é 100% reciclável, volta à prateleira em cerca de 60 dias e é uma das principais rendas dos catadores.", en: "Cans are 100% recyclable, are back on the shelf in about 60 days and are one of the main incomes of waste pickers.", es: "La lata es 100% reciclable, vuelve a la estantería en unos 60 días y es uno de los principales ingresos de los recicladores." }),
      proofType: "count",
      countItem: "can",
      countTarget: 30,
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
      sponsorName: "Cooperativa Reciclar Juntos",
      sponsorId: "sp-recicla",
      title: "Junte 10 pilhas usadas",
      titleEn: "Collect 10 used batteries",
      titleEs: "Junta 10 pilas usadas",
      description: "Pilha não vai no lixo comum. Junte pelo menos 10 pilhas usadas para levar a um ponto de coleta (mercados e farmácias costumam ter).",
      descriptionEn: "Batteries don't go in the regular bin. Save at least 10 used batteries to take to a collection point (supermarkets and pharmacies often have one).",
      descriptionEs: "Las pilas no van a la basura común. Junta al menos 10 pilas usadas para llevar a un punto de recolección (supermercados y farmacias suelen tener).",
      ...C({ pt: "Espalhe as pilhas sobre uma mesa, lado a lado, e fotografe de cima.", en: "Lay the batteries side by side on a table and photograph them from above.", es: "Coloca las pilas una al lado de otra sobre una mesa y fotografíalas desde arriba." }),
      ...I({ pt: "Pilhas no lixo comum liberam metais pesados que contaminam o solo e a água.", en: "Batteries in the regular bin release heavy metals that pollute soil and water.", es: "Las pilas en la basura común liberan metales pesados que contaminan el suelo y el agua." }),
      proofType: "count",
      countItem: "battery",
      countTarget: 10,
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
    const cans = missions.find((m) => m.id === "m-casa-reciclaveis") ?? marcoZero;
    const batteries = missions.find((m) => m.id === "m-casa-oleo") ?? marcoZero;
    // [person, mission, items counted, days ago]: the weight is estimated from the items (src/lib/proof.ts).
    const entries: [string, Mission, number, number][] = [
      ["u-bot-1", marcoZero, 60, 20],
      ["u-bot-2", cans, 120, 34],
      ["u-bot-3", marcoZero, 45, 47],
      ["u-bot-5", cans, 80, 15],
      ["u-bot-3", batteries, 24, 40],
      ["u-bot-1", olindaOleo, 2, 52],
      ["u-bot-2", olindaOleo, 1, 70],
      ["u-bot-4", olindaOleo, 1, 25],
    ];
    return entries.map(([userId, mission, count, days]) => {
      const { item } = countRule(mission);
      const material = COUNT_ITEM_INFO[item].material;
      return sub({
        id: `s-hist-${userId}-${mission.id}`,
        userId,
        missionId: mission.id,
        at: mission,
        photo: P(material === "oil" ? "🛢️" : "♻️", "#2dd4bf", "#0f766e", ({ pt: "Entrega de recicláveis", en: "Recyclables drop-off", es: "Entrega de reciclables" })),
        report: L({ pt: "Separei o material em casa ao longo das semanas e entreguei no ponto de coleta indicado na missão, com foto no local.", en: "I sorted the material at home over a few weeks and dropped it off at the collection point named in the mission, with a photo on site.", es: "Separé el material en casa durante semanas y lo entregué en el punto de recolección de la misión, con foto en el lugar." }),
        material,
        itemCount: count,
        weightKg: estimatedKg(item, count),
        weightSource: "estimated",
        status: "approved",
        reviewedBy: DEMO_IDS.moderator,
        rejectionReason: null,
        submittedAt: ago(days * DAY + 3 * 60 * 60 * 1000),
        reviewedAt: ago(days * DAY),
      });
    });
  };

  const submissions: Submission[] = [
    // Waiting for moderation (log in as moderator to review them)
    sub({
      id: "s-luana-praia",
      userId: "u-bot-2",
      missionId: boaViagem.id,
      at: boaViagem,
      photo: P("🧹", "#38bdf8", "#2563eb", ({ pt: "3 sacos recolhidos na areia", en: "3 bags collected from the sand", es: "3 bolsas recogidas en la arena" })),
      photoBefore: P("🗑️", "#fcd34d", "#b45309", ({ pt: "Antes: lixo espalhado na areia", en: "Before: litter scattered on the sand", es: "Antes: basura esparcida en la arena" })),
      report: L({ pt: "Fui com minha irmã no fim da tarde e recolhemos três sacos de lixo, principalmente copos plásticos e tampinhas perto do posto 7.", en: "I went with my sister in the late afternoon and we collected three bags of litter, mostly plastic cups and bottle caps near lifeguard post 7.", es: "Fui con mi hermana al final de la tarde y recogimos tres bolsas de basura, sobre todo vasos plásticos y tapitas cerca del puesto 7." }),
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
      photo: P("🌳", "#34d399", "#059669", ({ pt: "Muda de ipê plantada", en: "Ipê seedling planted", es: "Plantón de ipê plantado" })),
      report: L({ pt: "Plantei uma muda de ipê-amarelo na área indicada pela equipe do parque, ao lado da placa de identificação número 12.", en: "I planted a yellow ipê seedling in the area marked by the park team, next to identification sign number 12.", es: "Planté un plantón de ipê amarillo en el área indicada por el equipo del parque, junto a la placa número 12." }),
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
      photo: P("♻️", "#2dd4bf", "#0d9488", ({ pt: "Recicláveis separados", en: "Sorted recyclables", es: "Reciclables separados" })),
      report: L({ pt: "Juntei 25 garrafas PET durante a semana, espalhei no chão do ponto de coleta do Marco Zero e fotografei antes de entregar.", en: "I saved 25 PET bottles during the week, spread them on the ground at the Marco Zero collection point and took the photo before handing them in.", es: "Junté 25 botellas PET durante la semana, las extendí en el suelo del punto de recolección del Marco Zero y tomé la foto antes de entregarlas." }),
      material: "plastic",
      itemCount: 25,
      weightKg: estimatedKg("pet_bottle", 25),
      weightSource: "estimated",
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
      photo: P("♻️", "#2dd4bf", "#0f766e", ({ pt: "32 garrafas PET", en: "32 PET bottles", es: "32 botellas PET" })),
      report: L({ pt: "Juntei 32 garrafas PET lá de casa durante duas semanas e levei ao ponto de coleta do Marco Zero no domingo.", en: "I saved 32 PET bottles from home for two weeks and took them to the Marco Zero collection point on Sunday.", es: "Junté 32 botellas PET de casa durante dos semanas y las llevé al punto de recolección del Marco Zero el domingo." }),
      material: "plastic",
      itemCount: 32,
      weightKg: estimatedKg("pet_bottle", 32),
      weightSource: "estimated",
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
      photo: P("🤝", "#fbbf24", "#f97316", ({ pt: "Sacola de roupas doadas", en: "Bag of donated clothes", es: "Bolsa de ropa donada" })),
      report: L({ pt: "Doei duas sacolas de roupas infantis em bom estado na campanha de arrecadação do Parque Dona Lindu neste sábado.", en: "I donated two bags of children's clothes in good condition to the Dona Lindu Park clothing drive this Saturday.", es: "Doné dos bolsas de ropa infantil en buen estado en la campaña del Parque Dona Lindu este sábado." }),
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
      photo: P("🧹", "#94a3b8", "#475569", ({ pt: "Foto escura", en: "Dark photo", es: "Foto oscura" })),
      report: L({ pt: "Recolhi lixo na margem do rio perto da ponte, mas a foto ficou escura porque já estava anoitecendo quando terminei.", en: "I picked up litter on the riverbank near the bridge, but the photo came out dark because it was already getting dark when I finished.", es: "Recogí basura en la orilla del río cerca del puente, pero la foto salió oscura porque ya anochecía cuando terminé." }),
      status: "rejected",
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: L({ pt: "A foto não mostra os resíduos recolhidos. Envie uma nova foto com os sacos e o rio ao fundo.", en: "The photo doesn't show the collected waste. Send a new photo with the bags and the river in the background.", es: "La foto no muestra los residuos recogidos. Envía una nueva foto con las bolsas y el río al fondo." }),
      submittedAt: ago(6 * DAY),
      reviewedAt: ago(5 * DAY),
    }),
    // Other approved actions (feed the rewards panel)
    sub({
      id: "s-joao-jaqueira",
      userId: "u-bot-1",
      missionId: jaqueira.id,
      at: jaqueira,
      photo: P("🌳", "#4ade80", "#15803d", ({ pt: "Mutirão de plantio", en: "Planting drive", es: "Jornada de plantación" })),
      report: L({ pt: "Participei do mutirão de plantio do sábado e plantei duas mudas de pau-brasil junto com o pessoal da associação.", en: "I joined Saturday's planting drive and planted two brazilwood seedlings with the residents' association.", es: "Participé en la jornada de plantación del sábado y planté dos plantones de palo brasil con la asociación." }),
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
      photo: P("🧹", "#7dd3fc", "#0284c7", ({ pt: "Saco de lixo cheio", en: "Full bag of litter", es: "Bolsa de basura llena" })),
      report: L({ pt: "Fiz uma caminhada na orla recolhendo lixo e enchi um saco grande com plástico, isopor e bitucas de cigarro.", en: "I walked along the seafront picking up litter and filled a large bag with plastic, styrofoam and cigarette butts.", es: "Caminé por la costanera recogiendo basura y llené una bolsa grande con plástico, poliestireno y colillas." }),
      status: "approved",
      // Approved by the automatic verification and drawn for the sample audit (Moderation → Auditoria).
      photoBefore: P("🗑️", "#fde68a", "#b45309", ({ pt: "Antes: orla com lixo", en: "Before: littered seafront", es: "Antes: costanera con basura" })),
      reviewedBy: null,
      rejectionReason: null,
      decidedBy: "ai",
      aiStatus: "done",
      aiModel: "simulated",
      aiVerdict: "approve",
      aiConfidence: 90,
      aiReasonCode: null,
      aiSummary: L({ pt: "Saco de lixo cheio na orla, compatível com a missão de limpeza.", en: "Full bag of litter on the seafront, consistent with the clean-up mission.", es: "Bolsa de basura llena en la costanera, compatible con la misión de limpieza." }),
      trustScore: 82,
      aiChecks: {
        trustFactors: [
          { key: "ai_approve", points: 45 },
          { key: "gps_precise", points: 20 },
          { key: "history_new", points: 7 },
          { key: "evidence_before_after", points: 10 },
        ],
      },
      auditStatus: "pending",
      submittedAt: ago(2 * DAY),
      reviewedAt: ago(1 * DAY),
    }),
    // Older history: feeds Admin → Reciclagem and Admin → Dados (anonymous aggregates need 5+ people).
    ...impactHistory(),
  ];

  const rewards: Reward[] = [
    { id: "r-maria-marco", userId: DEMO_IDS.citizen, submissionId: "s-maria-marco", foneAmount: "15.00", status: "paid", txHash: "4e2a97c17c1e0b5d9a2f4e8c3b6a1d0f9e8c7b6a5d4c3b2a1f0e9d8c7b6a5d4c", createdAt: ago(11 * DAY), paidAt: ago(10 * DAY) },
    // Past the 7-day hold period: Ana can pay it right away. Rafael's reward is still in the hold period.
    { id: "r-maria-lindu", userId: DEMO_IDS.citizen, submissionId: "s-maria-lindu", foneAmount: "20.00", status: "pending", txHash: null, createdAt: ago(8 * DAY), paidAt: null },
    { id: "r-joao-jaqueira", userId: "u-bot-1", submissionId: "s-joao-jaqueira", foneAmount: "40.00", status: "paid", txHash: "b81f3d02b9d7f1a3c5e8b0d4f6a2c9e1b7d3f5a8c0e6b2d4f9a1c3e5b7d0f2a", createdAt: ago(8 * DAY), paidAt: ago(7 * DAY) },
    { id: "r-rafael-praia", userId: "u-bot-5", submissionId: "s-rafael-praia", foneAmount: "25.00", status: "pending", txHash: null, createdAt: ago(1 * DAY), paidAt: null },
  ];

  const chat: ChatMessage[] = [
    { id: "c1", userId: "u-bot-1", message: L({ pt: "Bom dia, pessoal! 🌞 Alguém vai no mutirão da Jaqueira no sábado?", en: "Morning, everyone! 🌞 Is anyone going to the Jaqueira clean-up on Saturday?", es: "¡Buen día a todos! 🌞 ¿Alguien va a la jornada de la Jaqueira el sábado?" }), replyToId: null, deleted: false, createdAt: ago(2 * DAY) },
    { id: "c2", userId: "u-bot-2", message: L({ pt: "Eu vou! Levo luvas extras pra quem precisar 🧤", en: "I'm going! I'll bring extra gloves for anyone who needs them 🧤", es: "¡Yo voy! Llevo guantes extra para quien necesite 🧤" }), replyToId: "c1", deleted: false, createdAt: ago(2 * DAY - 20 * 60 * 1000) },
    { id: "c3", userId: "u-bot-3", message: L({ pt: "Dica: no Marco Zero o ponto de coleta fica do lado do centro de artesanato ♻️", en: "Tip: at Marco Zero the collection point is next to the craft centre ♻️", es: "Dato: en el Marco Zero el punto de recolección está al lado del centro de artesanía ♻️" }), replyToId: null, deleted: false, createdAt: ago(1 * DAY) },
    { id: "c4", userId: "u-bot-4", message: L({ pt: "Valeu, Pedro! Entreguei meus recicláveis lá ontem.", en: "Thanks, Pedro! I dropped off my recyclables there yesterday.", es: "¡Gracias, Pedro! Entregué mis reciclables ahí ayer." }), replyToId: "c3", deleted: false, createdAt: ago(1 * DAY - 60 * 60 * 1000) },
    { id: "c5", userId: "u-bot-5", message: L({ pt: "Primeira missão aprovada! Bora subir no ranking 💪🌱", en: "First mission approved! Let's climb the ranking 💪🌱", es: "¡Primera misión aprobada! A subir en el ranking 💪🌱" }), replyToId: null, deleted: false, createdAt: ago(6 * 60 * 60 * 1000) },

    // Chat moderation examples (Moderation → Chat reports): one already hidden by 3 reports, one with 1 report.
    { id: "c6", userId: "u-bot-5", message: L({ pt: "Mutirão é coisa de otário, ninguém liga pra isso 🙄", en: "Clean-ups are for suckers, nobody cares about this 🙄", es: "Las jornadas son de tontos, a nadie le importa esto 🙄" }), replyToId: null, deleted: false, createdAt: ago(5 * 60 * 60 * 1000), hiddenAt: ago(4 * 60 * 60 * 1000), hiddenReason: "reports" },
    { id: "c7", userId: "u-bot-4", message: L({ pt: "Alguém quer comprar rifa? Me chamem no privado!", en: "Anyone want to buy a raffle ticket? DM me!", es: "¿Alguien quiere comprar una rifa? ¡Escríbanme en privado!" }), replyToId: null, deleted: false, createdAt: ago(3 * 60 * 60 * 1000) },
  ];

  const chatReports: DemoChatReport[] = [
    { id: "cr1", messageId: "c6", reporterId: "u-bot-1", reasonCode: "offense", detail: "", status: "pending", createdAt: ago(4.8 * 60 * 60 * 1000) },
    { id: "cr2", messageId: "c6", reporterId: "u-bot-2", reasonCode: "offense", detail: "", status: "pending", createdAt: ago(4.5 * 60 * 60 * 1000) },
    { id: "cr3", messageId: "c6", reporterId: "u-bot-3", reasonCode: "offense", detail: "", status: "pending", createdAt: ago(4 * 60 * 60 * 1000) },
    { id: "cr4", messageId: "c7", reporterId: "u-bot-1", reasonCode: "spam", detail: "", status: "pending", createdAt: ago(2 * 60 * 60 * 1000) },
  ];

  /* SaaS: a school on a free trial (teacher Juliana runs it, Maria takes part) and a paying company. */
  const school: DemoOrg = {
    id: "org-escola",
    name: "Escola Técnica Horizonte",
    slug: "escola-tecnica-horizonte",
    type: "school",
    city: "Recife",
    plan: "school",
    billingCycle: "monthly",
    subscriptionStatus: "trialing",
    currentPeriodEnd: new Date(Date.now() + 9 * DAY).toISOString(),
    trialUsed: true,
    inviteCode: "ESCOLA24",
    ownerId: DEMO_IDS.teacher,
    createdAt: ago(5 * DAY),
  };
  const company: DemoOrg = {
    id: "org-recicla",
    name: "Recicla Boa Viagem",
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
    orgMember(school.id, DEMO_IDS.teacher, "owner", 5),
    orgMember(school.id, DEMO_IDS.citizen, "member", 4),
    orgMember(school.id, "u-bot-2", "member", 4),
    orgMember(school.id, "u-bot-3", "member", 3),
    orgMember(school.id, "u-bot-4", "member", 3),
    orgMember(company.id, "u-bot-1", "owner", 45),
    orgMember(company.id, "u-bot-5", "member", 40),
  ];
  type Proof = Pick<Mission, "proofType" | "countItem" | "countTarget">;
  const orgMission = (id: string, title: Text3, description: Text3, category: Mission["category"], points: number, days: number, proof: Proof = {}): Mission => ({
    id,
    ...proof,
    title: title.pt,
    titleEn: title.en,
    titleEs: title.es,
    description: description.pt,
    descriptionEn: description.en,
    descriptionEs: description.es,
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
    orgMission("m-org-pilhas", { pt: "Coleta de pilhas e baterias", en: "Battery collection", es: "Recolección de pilas y baterías" }, { pt: "Traga pelo menos 10 pilhas usadas para a caixa de coleta da escola (bloco B). Antes de depositar, espalhe as pilhas sobre a mesa e fotografe.", en: "Bring at least 10 used batteries to the school collection box (block B). Before dropping them in, lay them out on the table and take a photo.", es: "Trae al menos 10 pilas usadas a la caja de recolección de la escuela (bloque B). Antes de depositarlas, extiéndelas sobre la mesa y toma una foto." }, "recycling", 30, 5, { proofType: "count", countItem: "battery", countTarget: 10 }),
    orgMission("m-org-horta", { pt: "Cuide da horta da escola", en: "Look after the school garden", es: "Cuida la huerta de la escuela" }, { pt: "Regue, retire ervas daninhas ou plante uma muda na horta da escola. Foto mostrando o canteiro.", en: "Water, weed or plant a seedling in the school garden. Photo showing the bed.", es: "Riega, quita malezas o planta un plantín en la huerta de la escuela. Foto mostrando el cantero." }, "planting", 40, 5, { proofType: "photo" }),
    orgMission("m-org-garrafa", { pt: "Caixas de leite para a reciclagem", en: "Milk cartons for recycling", es: "Cajas de leche para el reciclaje" }, { pt: "Junte pelo menos 20 caixas de leite ou suco limpas e abertas e traga para o ponto da escola. Espalhe as caixas lado a lado e fotografe.", en: "Save at least 20 clean, flattened milk or juice cartons and bring them to the school drop-off. Lay them side by side and take a photo.", es: "Junta al menos 20 cajas de leche o jugo limpias y abiertas y tráelas al punto de la escuela. Extiéndelas una al lado de otra y toma una foto." }, "recycling", 20, 2, { proofType: "count", countItem: "carton", countTarget: 20 }),
  ];
  missions.push(...schoolMissions);
  const orgSub = (id: string, userId: string, mission: Mission, days: number, emoji: string, caption: Text3): Submission =>
    sub({
      id,
      userId,
      missionId: mission.id,
      at: mission,
      photo: P(emoji, "#34d399", "#0d9488", caption),
      report: L(join(caption, { pt: "Atividade feita na escola junto com a turma, conforme as instruções da missão.", en: "Done at school with my class, following the mission instructions.", es: "Actividad hecha en la escuela con mi grupo, según las instrucciones de la misión." })),
      status: "approved",
      reviewedBy: DEMO_IDS.teacher,
      rejectionReason: null,
      submittedAt: ago(days * DAY + 3600000),
      reviewedAt: ago(days * DAY),
      decidedBy: "human",
    });
  submissions.push(
    orgSub("s-org-1", "u-bot-2", schoolMissions[0], 4, "🔋", { pt: "Entreguei 12 pilhas usadas", en: "Dropped off 12 used batteries", es: "Entregué 12 pilas usadas" }),
    orgSub("s-org-2", "u-bot-3", schoolMissions[1], 3, "🌱", { pt: "Plantei duas mudas de alface", en: "Planted two lettuce seedlings", es: "Planté dos plantines de lechuga" }),
    orgSub("s-org-3", "u-bot-2", schoolMissions[1], 2, "🌱", { pt: "Reguei e limpei o canteiro 3", en: "Watered and weeded bed 3", es: "Regué y limpié el cantero 3" }),
    orgSub("s-org-4", "u-bot-4", schoolMissions[0], 1, "🔋", { pt: "Trouxe as baterias do controle", en: "Brought the remote-control batteries", es: "Traje las pilas del control remoto" }),
    orgSub("s-org-5", DEMO_IDS.citizen, schoolMissions[0], 1, "🔋", { pt: "Levei as pilhas lá de casa", en: "Brought the batteries from home", es: "Llevé las pilas de casa" }),
  );
  /*
   * One-off events (mutirões, docs/MONETIZACAO.md §1): a free community collective run by Maria with a
   * finished beach clean-up (report locked until the event is paid) and an upcoming one; the school
   * (paid plan, report included) has a recycling drive happening right now.
   */
  const HOUR = 3600000;
  const collective: DemoOrg = {
    id: "org-praia",
    name: "Coletivo Praia Limpa",
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
  const eventMission = (id: string, orgId: string, title: Text3, description: Text3, category: Mission["category"], points: number, start: number, hours: number, proof: Proof = {}): Mission => ({
    ...orgMission(id, title, description, category, points, 6, proof),
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
    { pt: "Mutirão de limpeza na praia de Boa Viagem", en: "Boa Viagem beach clean-up day", es: "Jornada de limpieza en la playa de Boa Viagem" },
    { pt: "Encontro no Posto 7. Recolha o lixo da faixa de areia e fotografe o saco cheio junto com a equipe.", en: "Meet at lifeguard post 7. Collect litter from the sand and photograph the full bag with the team.", es: "Encuentro en el puesto 7. Recoge la basura de la arena y fotografía la bolsa llena con el equipo." },
    "cleanup",
    50,
    at(lastSaturday, 7),
    4,
    { proofType: "before_after" },
  );
  const parkCleanup = eventMission(
    "m-ev-jaqueira",
    collective.id,
    { pt: "Mutirão no Parque da Jaqueira", en: "Jaqueira Park clean-up day", es: "Jornada en el Parque da Jaqueira" },
    { pt: "Limpeza dos canteiros e do lago. Traga luvas e garrafa d'água; sacos por conta do coletivo.", en: "Cleaning the flower beds and the lake. Bring gloves and a water bottle; the collective provides bags.", es: "Limpieza de canteros y del lago. Trae guantes y botella de agua; las bolsas las pone el colectivo." },
    "cleanup",
    50,
    at(nextSaturday, 8),
    4,
    { proofType: "before_after" },
  );
  const schoolDrive = eventMission(
    "m-ev-feira",
    school.id,
    { pt: "Gincana de recicláveis da Feira de Ciências", en: "Science Fair recycling challenge", es: "Competencia de reciclables de la Feria de Ciencias" },
    { pt: "Traga pelo menos 15 garrafas PET para a gincana no pátio. Espalhe as garrafas na mesa da sua turma e fotografe antes de entregar.", en: "Bring at least 15 PET bottles to the challenge in the courtyard. Spread them on your class table and take a photo before handing them in.", es: "Trae al menos 15 botellas PET a la competencia en el patio. Extiéndelas en la mesa de tu grupo y toma una foto antes de entregarlas." },
    "recycling",
    40,
    // Happening now: started at the top of the previous hour, ends in a few hours.
    at(0, new Date().getHours() - 1),
    5,
    { proofType: "count", countItem: "pet_bottle", countTarget: 15 },
  );
  missions.push(beachCleanup, parkCleanup, schoolDrive);

  /*
   * Collection point with a scale (src/lib/partner.ts): the cooperative weighs deliveries at
   * #/ponto/<token>. One delivery is waiting for the counter (Pedro, code K7P-4QX) and one was weighed.
   */
  const coop: DemoPoint = {
    id: "pt-reciclar",
    name: "Ecoponto Reciclar Juntos",
    address: "Rua da Aurora, 100 - Boa Vista",
    city: "Recife",
    latitude: -8.0578,
    longitude: -34.8808,
    token: "reciclarjuntospontorecif",
    isActive: true,
    createdAt: ago(30 * DAY),
  };
  const coopMission: Mission = {
    id: "m-coop-entrega",
    title: "Entregue recicláveis no ecoponto",
    titleEn: "Drop off recyclables at the drop-off point",
    titleEs: "Entrega reciclables en el ecopunto",
    description: "Leve plástico, papel, metal ou vidro limpos ao Ecoponto Reciclar Juntos. A equipe pesa na balança e confirma pelo app.",
    descriptionEn: "Take clean plastic, paper, metal or glass to the Reciclar Juntos drop-off point. The team weighs it on the scale and confirms in the app.",
    descriptionEs: "Lleva plástico, papel, metal o vidrio limpios al Ecopunto Reciclar Juntos. El equipo lo pesa en la balanza y confirma en la app.",
    ...C({ pt: "Tire uma foto do material na entrada do ecoponto e envie. Depois mostre o QR de Meus envios no balcão.", en: "Take a photo of the material at the drop-off entrance and send it. Then show the QR from My submissions at the counter.", es: "Toma una foto del material en la entrada del ecopunto y envíala. Después muestra el QR de Mis envíos en el mostrador." }),
    ...I({ pt: "Cada quilo pesado no ecoponto vira renda para os catadores e um registro rastreável da coleta.", en: "Every kilo weighed at the drop-off point becomes income for waste pickers and a traceable record of the collection.", es: "Cada kilo pesado en el ecopunto se convierte en ingresos para los recicladores y un registro rastreable de la recolección." }),
    proofType: "partner",
    collectionPointId: coop.id,
    latitude: coop.latitude!,
    longitude: coop.longitude!,
    scope: "local",
    city: "Recife",
    stateCode: "PE",
    category: "recycling",
    pointsReward: 25,
    foneReward: "5.00",
    isActive: true,
    createdAt: ago(10 * DAY),
  };
  missions.push(coopMission);
  const coopAnalysis = (visible: string) => ({
    whatIsVisible: visible,
    matchesMission: true,
    isRealPhoto: true,
    screenOrPrint: false,
    aiGeneratedOrEdited: false,
    inappropriate: false,
    tooDarkOrBlurry: false,
    reportConsistent: true,
    identifiableFaces: false,
    internetCopy: false,
    internetSigns: "",
    itemCount: null,
    verdict: "approve" as const,
    confidence: 88,
    explanation: visible,
  });
  submissions.push(
    sub({
      id: "s-coop-pedro",
      userId: "u-bot-3",
      missionId: coopMission.id,
      at: coopMission,
      photo: P("♻️", "#5eead4", "#0f766e", { pt: "Sacolas de recicláveis no ecoponto", en: "Bags of recyclables at the drop-off", es: "Bolsas de reciclables en el ecopunto" }),
      report: L({ pt: "Levei duas sacolas com garrafas PET e papelão limpos para o ecoponto da Rua da Aurora. Agora falta a pesagem no balcão.", en: "I took two bags of clean PET bottles and cardboard to the drop-off point on Rua da Aurora. Now it only needs the weighing at the counter.", es: "Llevé dos bolsas con botellas PET y cartón limpios al ecopunto de la Rua da Aurora. Ahora falta el pesaje en el mostrador." }),
      status: "pending",
      reviewedBy: null,
      rejectionReason: null,
      aiStatus: "done",
      aiModel: "simulated",
      aiVerdict: "approve",
      aiConfidence: 88,
      aiReasonCode: null,
      aiSummary: L({ pt: "Sacolas com recicláveis na entrada de um ecoponto.", en: "Bags of recyclables at the entrance of a drop-off point.", es: "Bolsas con reciclables en la entrada de un ecopunto." }),
      aiChecks: { ...coopAnalysis("Sacolas com recicláveis na entrada de um ecoponto."), trustFactors: [{ key: "ai_approve", points: 45 }, { key: "gps_precise", points: 20 }, { key: "partner_waiting", points: 0 }] },
      trustScore: 65,
      deliveryCode: "K7P4QX",
      verifyBy: new Date(Date.now() + 46 * HOUR).toISOString(),
      submittedAt: ago(2 * HOUR),
      reviewedAt: null,
    }),
    sub({
      id: "s-coop-ana",
      userId: "u-bot-2",
      missionId: coopMission.id,
      at: coopMission,
      photo: P("📦", "#99f6e4", "#0d9488", { pt: "Papelão dobrado", en: "Folded cardboard", es: "Cartón doblado" }),
      report: L({ pt: "Juntei o papelão das caixas da mudança, dobrei tudo e levei ao ecoponto. A equipe pesou na hora.", en: "I gathered the cardboard from the moving boxes, folded it all and took it to the drop-off point. The team weighed it right away.", es: "Junté el cartón de las cajas de la mudanza, lo doblé todo y lo llevé al ecopunto. El equipo lo pesó en el momento." }),
      status: "approved",
      reviewedBy: null,
      rejectionReason: null,
      decidedBy: "ai",
      aiStatus: "done",
      aiModel: "simulated",
      aiVerdict: "approve",
      aiConfidence: 90,
      aiReasonCode: null,
      aiSummary: L({ pt: "Papelão dobrado em um ecoponto.", en: "Folded cardboard at a drop-off point.", es: "Cartón doblado en un ecopunto." }),
      aiChecks: { ...coopAnalysis("Papelão dobrado em um ecoponto."), trustFactors: [{ key: "ai_approve", points: 45 }, { key: "gps_precise", points: 20 }, { key: "partner_weighed", points: 30 }] },
      trustScore: 95,
      material: "paper",
      weightKg: 6.4,
      weightSource: "partner",
      deliveryCode: "M9R2TW",
      partnerConfirmedAt: ago(3 * DAY - 40 * 60000),
      partnerPointId: coop.id,
      submittedAt: ago(3 * DAY),
      reviewedAt: ago(3 * DAY - 39 * 60000),
    }),
  );
  // People who already checked in at the school drive happening now (Juliana shows the QR in Events).
  const checkins: DemoCheckin[] = ["u-bot-2", "u-bot-3"].map((userId, i) => ({
    id: `ck-feira-${i + 1}`,
    missionId: schoolDrive.id,
    userId,
    createdAt: new Date(new Date(schoolDrive.startsAt!).getTime() + (i + 1) * 12 * 60000).toISOString(),
  }));
  // Irregular dumping spots (src/lib/dumps.ts): one waiting for a confirmation (Maria can confirm it),
  // one confirmed with its cleanup mission, one the AI sent to the admin and one already cleaned.
  const dumpPhoto = (caption: Text3) => P("🗑️", "#a8a29e", "#57534e", caption);
  const dumpBase = { photoHash: "", accuracyM: 9, stateCode: "PE", aiReason: null, rejectionCode: null, missionId: null, confirmedAt: null, resolvedAt: null, needsReview: false } as const;
  const imbiribeiraNote = L({ pt: "Sacos de lixo e um sofá velho na calçada", en: "Rubbish bags and an old sofa on the pavement", es: "Bolsas de basura y un sofá viejo en la vereda" });
  const imbiribeiraFields = cleanupMission({ size: "small", city: "Recife", note: imbiribeiraNote });
  const dumpMission: Mission = {
    id: "m-dump-imbiribeira",
    title: imbiribeiraFields.title,
    titleEn: imbiribeiraFields.titleEn,
    titleEs: imbiribeiraFields.titleEs,
    description: imbiribeiraFields.description,
    descriptionEn: imbiribeiraFields.descriptionEn,
    descriptionEs: imbiribeiraFields.descriptionEs,
    context: imbiribeiraFields.context,
    latitude: -8.1102,
    longitude: -34.9061,
    category: "cleanup",
    pointsReward: CLEANUP_POINTS.small,
    foneReward: "0.00",
    isActive: true,
    createdAt: ago(4 * DAY),
    scope: "local",
    city: "Recife",
    stateCode: "PE",
    origin: "auto",
    needsReview: false,
    proofType: "before_after",
  };
  missions.push(dumpMission);
  const dumps: DemoDump[] = [
    {
      ...dumpBase,
      id: "d-aurora",
      userId: "u-bot-2",
      photoUrl: dumpPhoto({ pt: "Entulho na beira do rio", en: "Rubble by the river", es: "Escombros junto al río" }),
      photoHash: "seed-d-aurora",
      latitude: -8.0596,
      longitude: -34.8806,
      city: "Recife",
      size: "medium",
      note: L({ pt: "Entulho e sacos na margem do Capibaribe, perto da ponte", en: "Rubble and bags on the Capibaribe bank, near the bridge", es: "Escombros y bolsas en la orilla del Capibaribe, cerca del puente" }),
      status: "open",
      createdAt: ago(2 * DAY),
    },
    {
      ...dumpBase,
      id: "d-imbiribeira",
      userId: "u-bot-3",
      photoUrl: dumpPhoto({ pt: "Sofá velho na calçada", en: "Old sofa on the pavement", es: "Sofá viejo en la vereda" }),
      photoHash: "seed-d-imbiribeira",
      latitude: -8.1102,
      longitude: -34.9061,
      city: "Recife",
      size: "small",
      note: imbiribeiraNote,
      status: "confirmed",
      missionId: dumpMission.id,
      createdAt: ago(5 * DAY),
      confirmedAt: ago(4 * DAY),
    },
    {
      ...dumpBase,
      id: "d-review",
      userId: "u-bot-5",
      photoUrl: dumpPhoto({ pt: "Lixo no terreno · © banco de imagens", en: "Rubbish in a lot · © stock photo", es: "Basura en un terreno · © banco de imágenes" }),
      photoHash: "seed-d-review",
      latitude: -8.0476,
      longitude: -34.9013,
      city: "Recife",
      size: "large",
      note: null,
      status: "pending",
      needsReview: true,
      aiReason: L({
        pt: "A foto tem marca d'água de banco de imagens: pode ter sido baixada da internet.",
        en: "The photo has a stock-image watermark: it may have been downloaded from the internet.",
        es: "La foto tiene marca de agua de banco de imágenes: puede haber sido descargada de internet.",
      }),
      createdAt: ago(1 * DAY),
    },
    {
      ...dumpBase,
      id: "d-maria-done",
      userId: DEMO_IDS.citizen,
      photoUrl: dumpPhoto({ pt: "Sacos de lixo na esquina", en: "Rubbish bags on the corner", es: "Bolsas de basura en la esquina" }),
      photoHash: "seed-d-maria",
      latitude: -8.0632,
      longitude: -34.8712,
      city: "Recife",
      size: "small",
      note: L({ pt: "Esquina da praça, perto da parada de ônibus", en: "Corner of the square, near the bus stop", es: "Esquina de la plaza, cerca de la parada de autobús" }),
      status: "resolved",
      createdAt: ago(9 * DAY),
      confirmedAt: ago(8 * DAY),
      resolvedAt: ago(6 * DAY),
    },
  ];
  const dumpConfirmations: DemoDumpConfirmation[] = [
    { id: "dc-imbiribeira", reportId: "d-imbiribeira", userId: "u-bot-1", photoUrl: dumps[1].photoUrl, photoHash: "seed-dc-imbiribeira", latitude: -8.1103, longitude: -34.9059, createdAt: ago(4 * DAY) },
    { id: "dc-maria", reportId: "d-maria-done", userId: "u-bot-4", photoUrl: dumps[3].photoUrl, photoHash: "seed-dc-maria", latitude: -8.0631, longitude: -34.8713, createdAt: ago(8 * DAY) },
  ];

  const beachPeople: [string, Text3][] = [
    ["u-bot-1", { pt: "Recolhi garrafas e tampinhas perto do Posto 7", en: "Collected bottles and caps near post 7", es: "Recogí botellas y tapitas cerca del puesto 7" }],
    ["u-bot-2", { pt: "Dois sacos de plástico e isopor", en: "Two bags of plastic and styrofoam", es: "Dos bolsas de plástico y poliestireno" }],
    ["u-bot-3", { pt: "Bitucas de cigarro e canudos na areia", en: "Cigarette butts and straws in the sand", es: "Colillas y pajitas en la arena" }],
    ["u-bot-4", { pt: "Redes de pesca e latas perto das pedras", en: "Fishing nets and cans near the rocks", es: "Redes de pesca y latas cerca de las rocas" }],
    ["u-bot-5", { pt: "Limpei a área do quiosque com a equipe", en: "Cleaned the kiosk area with the team", es: "Limpié la zona del quiosco con el equipo" }],
  ];
  submissions.push(
    ...beachPeople.map(([userId, caption], i) =>
      sub({
        id: `s-ev-praia-${i + 1}`,
        userId,
        missionId: beachCleanup.id,
        at: beachCleanup,
        photo: P(["🧴", "🛍️", "🚬", "🎣", "🏖️"][i], "#38bdf8", "#2456d0", caption),
        report: L(join(caption, { pt: "Participei do mutirão do coletivo na praia de Boa Viagem e separei o lixo recolhido.", en: "I joined the collective's clean-up at Boa Viagem beach and sorted the litter we collected.", es: "Participé en la jornada del colectivo en la playa de Boa Viagem y separé la basura recogida." })),
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
    { id: "inv-recicla-1", orgId: company.id, plan: "business", billingCycle: "monthly", amountCents: 34900, status: "paid", reference: "EVKPWA2K7Q9X", reportedAt: ago(12 * DAY), createdAt: ago(12 * DAY), paidAt: ago(12 * DAY) },
    { id: "inv-recicla-0", orgId: company.id, plan: "business", billingCycle: "monthly", amountCents: 34900, status: "paid", reference: "EVRTNB8M3T4R", reportedAt: ago(42 * DAY), createdAt: ago(42 * DAY), paidAt: ago(42 * DAY) },
  ];

  // Local business benefits (Benefícios): one featured 18+, one open to all ages, one locked by points.
  const offers: DemoOffer[] = [
    {
      id: "of-cafe",
      partnerName: "Café Verde",
      ...T({ pt: "Café coado grátis na compra de um bolo", en: "Free filter coffee with any cake", es: "Café de filtro gratis al comprar una torta" }),
      ...D({ pt: "Válido de segunda a sexta, das 8h às 18h. Um por pessoa, não cumulativo com outras promoções.", en: "Valid Monday to Friday, 8 am to 6 pm. One per person, cannot be combined with other offers.", es: "Válido de lunes a viernes, de 8 a 18 h. Uno por persona, no acumulable con otras promociones." }),
      kind: "food",
      city: "Recife",
      address: "Rua da Aurora, 300 — Boa Vista",
      minPoints: 50,
      adultsOnly: true,
      maxRedemptions: 100,
      expiresAt: null,
      featured: true,
      monthlyFeeCents: 14900,
      partnerToken: "cafeverdeparceirorecife2",
      isActive: true,
      createdAt: ago(25 * DAY),
    },
    {
      id: "of-livraria",
      partnerName: "Livraria Folha Nova",
      ...T({ pt: "15% em livros de ciência e natureza", en: "15% off science and nature books", es: "15% en libros de ciencia y naturaleza" }),
      ...D({ pt: "Mostre o código no caixa. Vale para livros das seções de ciência, natureza e infantojuvenil.", en: "Show the code at the till. Valid for books in the science, nature and children's sections.", es: "Muestra el código en la caja. Vale para libros de ciencia, naturaleza e infantiles." }),
      kind: "culture",
      city: "Recife",
      address: "Rua do Futuro, 120 — Graças",
      minPoints: 30,
      adultsOnly: false,
      maxRedemptions: null,
      expiresAt: new Date(Date.now() + 60 * DAY).toISOString(),
      featured: false,
      monthlyFeeCents: 4900,
      partnerToken: "folhanovaparceirorecife2",
      isActive: true,
      createdAt: ago(18 * DAY),
    },
    {
      id: "of-bike",
      partnerName: "Pedal Verde Bikes",
      ...T({ pt: "Revisão de bicicleta com 20% de desconto", en: "20% off a bike service", es: "Revisión de bicicleta con 20% de descuento" }),
      ...D({ pt: "Revisão completa (freios, câmbio e calibragem). Agende pelo WhatsApp da loja e mostre o código.", en: "Full service (brakes, gears and tyre pressure). Book on the shop's WhatsApp and show the code.", es: "Revisión completa (frenos, cambios y presión). Agenda por el WhatsApp de la tienda y muestra el código." }),
      kind: "bike",
      city: "Recife",
      address: "Av. Conselheiro Aguiar, 1200 — Boa Viagem",
      minPoints: 150,
      adultsOnly: true,
      maxRedemptions: 40,
      expiresAt: null,
      featured: false,
      monthlyFeeCents: 4900,
      partnerToken: "pedalverdeparceirorecife",
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
      title: L({ pt: "Comprovação aprovada! 🎉", en: "Proof approved! 🎉", es: "¡Comprobante aprobado! 🎉" }),
      message: L(
        PAYMENTS_ENABLED
          ? {
              pt: "Sua comprovação para \"Doação de roupas no Parque Dona Lindu\" foi aprovada. Você ganhou 40 pontos e 20.00 FONE entrou na fila de pagamento.",
              en: "Your proof for \"Clothing donation at Dona Lindu Park\" was approved. You earned 40 points and 20.00 FONE is queued for payout.",
              es: "Tu comprobante para \"Donación de ropa en el Parque Dona Lindu\" fue aprobado. Ganaste 40 puntos y 20.00 FONE entró en la cola de pago.",
            }
          : {
              pt: "Sua comprovação para \"Doação de roupas no Parque Dona Lindu\" foi aprovada. Você ganhou 40 pontos.",
              en: "Your proof for \"Clothing donation at Dona Lindu Park\" was approved. You earned 40 points.",
              es: "Tu comprobante para \"Donación de ropa en el Parque Dona Lindu\" fue aprobado. Ganaste 40 puntos.",
            },
      ),
      isRead: false,
      createdAt: ago(8 * DAY),
    },
    {
      id: "n-maria-capibaribe",
      userId: DEMO_IDS.citizen,
      title: L({ pt: "Comprovação rejeitada", en: "Proof rejected", es: "Comprobante rechazado" }),
      message: L({
        pt: "Sua comprovação para \"Limpeza às margens do Capibaribe\" foi rejeitada. Motivo: A foto não mostra os resíduos recolhidos. Você pode enviar uma nova comprovação.",
        en: "Your proof for \"Capibaribe riverbank cleanup\" was rejected. Reason: The photo doesn't show the collected waste. You can submit new proof.",
        es: "Tu comprobante para \"Limpieza en las orillas del Capibaribe\" fue rechazado. Motivo: La foto no muestra los residuos recogidos. Puedes enviar uno nuevo.",
      }),
      isRead: true,
      createdAt: ago(5 * DAY),
    },
  ];

  return {
    version: STATE_VERSION,
    currentUserId: null,
    guestLanguage: lang,
    users,
    missions,
    submissions,
    rewards,
    notifications,
    chat,
    chatReports,
    chatBlocks: [],
    region: null,
    missionRequests: [],
    seededCities: [],
    payoutSettings: { minPayoutFone: 5, holdDays: 7, monthlyBudgetFone: 500, maxFonePerUserMonth: 100 },
    orgs: [school, company, collective],
    orgMembers,
    invoices,
    sponsors: [{ id: "sp-recicla", name: "Cooperativa Reciclar Juntos", budgetFone: "30.00", isActive: true, createdAt: ago(20 * DAY) }],
    // One example yellow card, so Admin → Users shows the badge and the sheet has something.
    cards: [
      {
        id: "card-example-1",
        userId: "u-bot-5",
        type: "yellow",
        reasonCode: "internet_copy",
        note: L({ pt: "A foto enviada é a mesma de um site de notícias (achamos no Google Lens).", en: "The photo sent is the same as one on a news website (found with Google Lens).", es: "La foto enviada es la misma de un sitio de noticias (la encontramos con Google Lens)." }),
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
    collectionPoints: [coop],
    checkins,
    dumps,
    dumpConfirmations,
  };
}

