import type { ChatMessage, DemoInvoice, DemoOffer, DemoRedemption, DemoOrg, DemoOrgMember, Mission, Notification, Reward, State, Submission, User } from "./store";
import { placeholderPhoto } from "./media";
import { PAYMENTS_ENABLED } from "@/lib/features";
import type { Material } from "@/lib/impact";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { registerText } from "./seed-text";

/** Initial data of the offline demo. Missions match scripts/seed.ts (Recife). */

/** Bump when the stored shape changes: old demo data is replaced by a fresh seed. */
export const STATE_VERSION = 13;

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
      ...C({ pt: "Leve luvas e sacos. Fotografe o material recolhido com a praia ao fundo.", en: "Bring gloves and bags. Photograph the waste you collected with the beach in the background.", es: "Lleva guantes y bolsas. Fotografía lo recogido con la playa al fondo." }),
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
      ...C({ pt: "Fotografe o material separado no ponto de coleta.", en: "Photograph the sorted material at the collection point.", es: "Fotografía el material separado en el punto de recolección." }),
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
      description: "Doe roupas em bom estado na campanha de arrecadação.",
      descriptionEn: "Donate clothes in good condition to the collection campaign.",
      descriptionEs: "Dona ropa en buen estado en la campaña de recolección.",
      ...C({ pt: "Fotografe a entrega no ponto de arrecadação.", en: "Photograph the drop-off at the donation point.", es: "Fotografía la entrega en el punto de recolección." }),
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
      ...C({ pt: "Use luvas, não entre na água e fotografe os sacos recolhidos com o rio ao fundo.", en: "Wear gloves, stay out of the water and photograph the bags with the river in the background.", es: "Usa guantes, no entres al agua y fotografía las bolsas con el río al fondo." }),
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
      description: "Junte óleo de cozinha usado em garrafa PET e entregue no ponto de coleta do Alto da Sé.",
      descriptionEn: "Store used cooking oil in a PET bottle and deliver it to the Alto da Sé collection point.",
      descriptionEs: "Junta aceite de cocina usado en una botella PET y entrégalo en el punto del Alto da Sé.",
      ...C({ pt: "Fotografe a garrafa no ponto de coleta.", en: "Photograph the bottle at the collection point.", es: "Fotografía la botella en el punto de recolección." }),
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
      title: "Separe o lixo reciclável em casa",
      titleEn: "Sort recyclables at home",
      titleEs: "Separa los reciclables en casa",
      description: "Monte um ponto de separação em casa (plástico, papel, metal e vidro) e mostre os recicláveis limpos e separados.",
      descriptionEn: "Set up a sorting spot at home (plastic, paper, metal and glass) and show the clean, sorted recyclables.",
      descriptionEs: "Arma un punto de separación en casa (plástico, papel, metal y vidrio) y muestra los reciclables limpios y separados.",
      ...C({ pt: "Fotografe os recicláveis limpos e separados por tipo (sacolas, caixas ou lixeiras diferentes).", en: "Photograph the clean recyclables sorted by type (separate bags, boxes or bins).", es: "Fotografía los reciclables limpios y separados por tipo (bolsas, cajas o cubos distintos)." }),
      ...I({ pt: "Material limpo e separado vale mais para as cooperativas de catadores e não vai para o aterro.", en: "Clean, sorted material is worth more to waste-picker cooperatives and stays out of the landfill.", es: "El material limpio y separado vale más para las cooperativas y no va al vertedero." }),
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
      title: "Guarde o óleo de cozinha usado",
      titleEn: "Store used cooking oil",
      titleEs: "Guarda el aceite de cocina usado",
      description: "Em vez de jogar na pia, guarde o óleo usado frio numa garrafa PET fechada para levar a um ponto de coleta.",
      descriptionEn: "Instead of pouring it down the sink, store cold used oil in a closed PET bottle to take to a collection point.",
      descriptionEs: "En lugar de tirarlo al fregadero, guarda el aceite usado frío en una botella PET cerrada para llevarlo a un punto de recolección.",
      ...C({ pt: "Fotografe a garrafa PET fechada com o óleo usado.", en: "Photograph the closed PET bottle with the used oil.", es: "Fotografía la botella PET cerrada con el aceite usado." }),
      ...I({ pt: "Um litro de óleo pode contaminar milhares de litros de água e entupir a rede de esgoto.", en: "One litre of oil can contaminate thousands of litres of water and clog the sewer system.", es: "Un litro de aceite puede contaminar miles de litros de agua y tapar el alcantarillado." }),
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
        photo: P(material === "oil" ? "🛢️" : "♻️", "#2dd4bf", "#0f766e", ({ pt: "Entrega de recicláveis", en: "Recyclables drop-off", es: "Entrega de reciclables" })),
        report: L({ pt: "Separei o material em casa ao longo das semanas e entreguei no ponto de coleta indicado na missão, com foto no local.", en: "I sorted the material at home over a few weeks and dropped it off at the collection point named in the mission, with a photo on site.", es: "Separé el material en casa durante semanas y lo entregué en el punto de recolección de la misión, con foto en el lugar." }),
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
      photo: P("🧹", "#38bdf8", "#2563eb", ({ pt: "3 sacos recolhidos na areia", en: "3 bags collected from the sand", es: "3 bolsas recogidas en la arena" })),
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
      report: L({ pt: "Separei garrafas PET, latinhas e papelão durante a semana e entreguei tudo no ponto de coleta seletiva do Marco Zero.", en: "I sorted PET bottles, cans and cardboard during the week and took everything to the Marco Zero recycling point.", es: "Separé botellas PET, latas y cartón durante la semana y lo entregué todo en el punto de reciclaje del Marco Zero." }),
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
      photo: P("♻️", "#2dd4bf", "#0f766e", ({ pt: "Garrafas e latinhas", en: "Bottles and cans", es: "Botellas y latas" })),
      report: L({ pt: "Juntei as garrafas e latinhas lá de casa durante duas semanas e levei ao ponto de coleta do Marco Zero no domingo.", en: "I saved the bottles and cans from home for two weeks and took them to the Marco Zero collection point on Sunday.", es: "Junté las botellas y latas de casa durante dos semanas y las llevé al punto de recolección del Marco Zero el domingo." }),
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
      reviewedBy: DEMO_IDS.moderator,
      rejectionReason: null,
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
  const orgMission = (id: string, title: Text3, description: Text3, category: Mission["category"], points: number, days: number): Mission => ({
    id,
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
    orgMission("m-org-pilhas", { pt: "Coleta de pilhas e baterias", en: "Battery collection", es: "Recolección de pilas y baterías" }, { pt: "Traga pilhas usadas para a caixa de coleta da escola (bloco B) e fotografe a entrega.", en: "Bring used batteries to the school collection box (block B) and photograph the drop-off.", es: "Trae pilas usadas a la caja de recolección de la escuela (bloque B) y fotografía la entrega." }, "recycling", 30, 5),
    orgMission("m-org-horta", { pt: "Cuide da horta da escola", en: "Look after the school garden", es: "Cuida la huerta de la escuela" }, { pt: "Regue, retire ervas daninhas ou plante uma muda na horta da escola. Foto mostrando o canteiro.", en: "Water, weed or plant a seedling in the school garden. Photo showing the bed.", es: "Riega, quita malezas o planta un plantín en la huerta de la escuela. Foto mostrando el cantero." }, "planting", 40, 5),
    orgMission("m-org-garrafa", { pt: "Semana da garrafa reutilizável", en: "Reusable bottle week", es: "Semana de la botella reutilizable" }, { pt: "Use sua garrafa reutilizável em vez de copos descartáveis durante a semana. Foto com a garrafa na escola.", en: "Use your reusable bottle instead of disposable cups all week. Photo with the bottle at school.", es: "Usa tu botella reutilizable en lugar de vasos descartables durante la semana. Foto con la botella en la escuela." }, "other", 20, 2),
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
  const eventMission = (id: string, orgId: string, title: Text3, description: Text3, category: Mission["category"], points: number, start: number, hours: number): Mission => ({
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
    { pt: "Mutirão de limpeza na praia de Boa Viagem", en: "Boa Viagem beach clean-up day", es: "Jornada de limpieza en la playa de Boa Viagem" },
    { pt: "Encontro no Posto 7. Recolha o lixo da faixa de areia e fotografe o saco cheio junto com a equipe.", en: "Meet at lifeguard post 7. Collect litter from the sand and photograph the full bag with the team.", es: "Encuentro en el puesto 7. Recoge la basura de la arena y fotografía la bolsa llena con el equipo." },
    "cleanup",
    50,
    at(lastSaturday, 7),
    4,
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
  );
  const schoolDrive = eventMission(
    "m-ev-feira",
    school.id,
    { pt: "Gincana de recicláveis da Feira de Ciências", en: "Science Fair recycling challenge", es: "Competencia de reciclables de la Feria de Ciencias" },
    { pt: "Traga recicláveis separados para a gincana no pátio e fotografe a entrega na mesa da sua turma.", en: "Bring sorted recyclables to the challenge in the courtyard and photograph the drop-off at your class table.", es: "Trae reciclables separados a la competencia en el patio y fotografía la entrega en la mesa de tu grupo." },
    "recycling",
    40,
    // Happening now: started at the top of the previous hour, ends in a few hours.
    at(0, new Date().getHours() - 1),
    5,
  );
  missions.push(beachCleanup, parkCleanup, schoolDrive);
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
  };
}

