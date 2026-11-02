/**
 * Missions anyone can do wherever they are (scope "anywhere"): shown in every region and country,
 * so nobody opens the app to an empty list. All of them are proven by a photo the AI can check
 * (items to count, or before/after) and pay points only: no FONE, so there is nothing to farm.
 *
 * Pure data shared by scripts/seed.ts, the offline demo and supabase/07_missoes_qualquer_lugar.sql
 * (tests/anywhere-missions.test.ts keeps the SQL file in sync with this list).
 */
import type { CountItem, ProofType } from "@/lib/proof";

type Text3 = { pt: string; en: string; es: string };

export type AnywhereMission = {
  /** Stable id (used by the demo). */
  key: string;
  title: Text3;
  description: Text3;
  /** How to take the photo. */
  context: Text3;
  impact: Text3;
  /** What the AI must see in the photo (Portuguese, like the other missions). */
  aiChecklist: string;
  category: "planting" | "donation" | "recycling" | "cleanup" | "other";
  proofType: ProofType;
  countItem?: CountItem;
  countTarget?: number;
  points: number;
};

export const ANYWHERE_MISSIONS: AnywhereMission[] = [
  {
    key: "walk-cleanup",
    title: { pt: "Recolha lixo numa caminhada", en: "Pick up litter on a walk", es: "Recoge basura en una caminata" },
    description: {
      pt: "Escolha um trecho de rua, praça, praia ou trilha com lixo no chão e deixe-o limpo. Descarte o que recolheu na lixeira certa.",
      en: "Pick a stretch of street, square, beach or trail with litter on the ground and leave it clean. Put what you collect in the right bin.",
      es: "Elige un tramo de calle, plaza, playa o sendero con basura en el suelo y déjalo limpio. Tira lo que recojas en el contenedor correcto.",
    },
    context: {
      pt: "Tire uma foto ANTES do trecho sujo e outra DEPOIS, do mesmo ângulo, com o saco de lixo recolhido aparecendo.",
      en: "Take one photo BEFORE of the littered stretch and one AFTER from the same angle, with the bag of collected litter in view.",
      es: "Toma una foto ANTES del tramo sucio y otra DESPUÉS desde el mismo ángulo, con la bolsa de basura recogida a la vista.",
    },
    impact: {
      pt: "Lixo jogado na rua entope bueiros, causa alagamentos e acaba em rios e no mar.",
      en: "Street litter clogs drains, causes flooding and ends up in rivers and the sea.",
      es: "La basura en la calle tapa desagües, provoca inundaciones y termina en ríos y en el mar.",
    },
    aiChecklist: "antes: lixo espalhado no chão de um trecho de rua, praça, praia ou trilha; depois: o mesmo trecho limpo e um saco com o lixo recolhido",
    category: "cleanup",
    proofType: "before_after",
    points: 30,
  },
  {
    key: "home-recyclables",
    title: { pt: "Separe um saco de recicláveis em casa", en: "Fill a bag of sorted recyclables at home", es: "Separa una bolsa de reciclables en casa" },
    description: {
      pt: "Junte em casa um saco cheio de recicláveis limpos e separados do lixo comum (plástico, papel, metal, vidro) e entregue à coleta seletiva, a um catador ou a um ponto de coleta.",
      en: "At home, fill a bag with clean recyclables kept apart from regular waste (plastic, paper, metal, glass) and hand it to separate collection, a waste picker or a drop-off point.",
      es: "En casa, llena una bolsa con reciclables limpios separados de la basura común (plástico, papel, metal, vidrio) y entrégala a la recolección selectiva, a un reciclador o a un punto de recolección.",
    },
    context: {
      pt: "Abra o saco cheio e fotografe de cima, mostrando os recicláveis limpos lá dentro.",
      en: "Open the full bag and photograph it from above, showing the clean recyclables inside.",
      es: "Abre la bolsa llena y fotografíala desde arriba, mostrando los reciclables limpios adentro.",
    },
    impact: {
      pt: "Reciclável limpo e separado vale mais para os catadores e não se perde no aterro.",
      en: "Clean, sorted recyclables are worth more to waste pickers and don't get lost in landfill.",
      es: "El reciclable limpio y separado vale más para los recicladores y no se pierde en el vertedero.",
    },
    aiChecklist: "um saco grande aberto e cheio de recicláveis limpos (garrafas, latas, papel, caixas), sem restos de comida",
    category: "recycling",
    proofType: "count",
    countItem: "recyclables_bag",
    countTarget: 1,
    points: 20,
  },
  {
    key: "cooking-oil",
    title: { pt: "Guarde 1 garrafa de óleo de cozinha usado", en: "Save 1 bottle of used cooking oil", es: "Guarda 1 botella de aceite de cocina usado" },
    description: {
      pt: "Em vez de jogar na pia, guarde o óleo de fritura usado (já frio) numa garrafa PET de 2 L e leve a um ponto de coleta.",
      en: "Instead of pouring it down the sink, save used frying oil (once cold) in a 2 L PET bottle and take it to a collection point.",
      es: "En lugar de tirarlo por el fregadero, guarda el aceite de freír usado (ya frío) en una botella PET de 2 L y llévalo a un punto de recolección.",
    },
    context: {
      pt: "Fotografe a garrafa cheia e bem fechada, de pé, com o óleo aparecendo.",
      en: "Photograph the full, tightly closed bottle standing up, with the oil visible.",
      es: "Fotografía la botella llena y bien cerrada, de pie, con el aceite a la vista.",
    },
    impact: {
      pt: "Um litro de óleo na pia pode contaminar até 25 mil litros de água. Reciclado, vira sabão e biodiesel.",
      en: "One litre of oil down the sink can contaminate up to 25,000 litres of water. Recycled, it becomes soap and biodiesel.",
      es: "Un litro de aceite en el fregadero puede contaminar hasta 25 mil litros de agua. Reciclado, se convierte en jabón y biodiésel.",
    },
    aiChecklist: "garrafa PET de cerca de 2 litros cheia de óleo de cozinha usado, fechada",
    category: "recycling",
    proofType: "count",
    countItem: "oil_bottle",
    countTarget: 1,
    points: 25,
  },
  {
    key: "cartons",
    title: { pt: "Junte 20 caixas longa vida", en: "Collect 20 drink cartons", es: "Junta 20 envases de cartón" },
    description: {
      pt: "Junte pelo menos 20 caixas de leite ou suco, lavadas e abertas, para a coleta seletiva ou um ponto de coleta.",
      en: "Save at least 20 milk or juice cartons, rinsed and flattened, for separate collection or a drop-off point.",
      es: "Junta al menos 20 cajas de leche o jugo, enjuagadas y aplastadas, para la recolección selectiva o un punto de recolección.",
    },
    context: {
      pt: "Espalhe as caixas lado a lado no chão, sem empilhar, e fotografe todas de cima.",
      en: "Lay the cartons side by side on the floor without stacking and photograph them all from above.",
      es: "Extiende las cajas una al lado de otra en el suelo, sin apilar, y fotografíalas todas desde arriba.",
    },
    impact: {
      pt: "A caixa longa vida tem papel, plástico e alumínio: reciclada, vira papelão e telhas.",
      en: "Drink cartons combine paper, plastic and aluminium: recycled, they become cardboard and roof tiles.",
      es: "El envase de cartón tiene papel, plástico y aluminio: reciclado, se convierte en cartón y tejas.",
    },
    aiChecklist: "caixas longa vida (leite ou suco) abertas, lado a lado no chão, todas visíveis para contar",
    category: "recycling",
    proofType: "count",
    countItem: "carton",
    countTarget: 20,
    points: 15,
  },
  {
    key: "pet-bottles",
    title: { pt: "Junte 15 garrafas PET", en: "Collect 15 PET bottles", es: "Junta 15 botellas PET" },
    description: {
      pt: "Junte pelo menos 15 garrafas PET vazias e limpas para a coleta seletiva, um catador ou um ponto de coleta.",
      en: "Save at least 15 empty, clean PET bottles for separate collection, a waste picker or a drop-off point.",
      es: "Junta al menos 15 botellas PET vacías y limpias para la recolección selectiva, un reciclador o un punto de recolección.",
    },
    context: {
      pt: "Deite as garrafas lado a lado no chão, sem empilhar, e fotografe todas de cima.",
      en: "Lay the bottles side by side on the floor without stacking and photograph them all from above.",
      es: "Acuesta las botellas una al lado de otra en el suelo, sin apilar, y fotografíalas todas desde arriba.",
    },
    impact: {
      pt: "Uma garrafa PET leva mais de 400 anos para se decompor. Reciclada, vira tecido, vassoura e novas embalagens.",
      en: "A PET bottle takes over 400 years to break down. Recycled, it becomes fabric, brooms and new packaging.",
      es: "Una botella PET tarda más de 400 años en descomponerse. Reciclada, se convierte en tela, escobas y nuevos envases.",
    },
    aiChecklist: "garrafas PET vazias deitadas lado a lado no chão, todas visíveis para contar",
    category: "recycling",
    proofType: "count",
    countItem: "pet_bottle",
    countTarget: 15,
    points: 15,
  },
  {
    key: "donate-clothes",
    title: { pt: "Separe 5 roupas para doação", en: "Set aside 5 pieces of clothing to donate", es: "Separa 5 prendas para donar" },
    description: {
      pt: "Separe pelo menos 5 peças de roupa em bom estado que você não usa mais e doe para uma instituição, igreja, bazar ou campanha.",
      en: "Set aside at least 5 pieces of clothing in good condition you no longer wear and donate them to a charity, church, thrift shop or drive.",
      es: "Separa al menos 5 prendas en buen estado que ya no uses y dónalas a una institución, iglesia, bazar o campaña.",
    },
    context: {
      pt: "Dobre as peças e coloque lado a lado, sem empilhar, e fotografe todas de cima.",
      en: "Fold the pieces, lay them side by side without stacking and photograph them all from above.",
      es: "Dobla las prendas, colócalas una al lado de otra sin apilar y fotografíalas todas desde arriba.",
    },
    impact: {
      pt: "Roupa doada ajuda quem precisa e evita que tecido vá para o lixo: a moda é uma das indústrias que mais poluem.",
      en: "Donated clothes help people in need and keep fabric out of the bin: fashion is one of the most polluting industries.",
      es: "La ropa donada ayuda a quien la necesita y evita que la tela vaya a la basura: la moda es una de las industrias más contaminantes.",
    },
    aiChecklist: "peças de roupa em bom estado, dobradas e lado a lado, todas visíveis para contar",
    category: "donation",
    proofType: "count",
    countItem: "clothing",
    countTarget: 5,
    points: 20,
  },
  {
    key: "donate-books",
    title: { pt: "Separe 3 livros para doação", en: "Set aside 3 books to donate", es: "Separa 3 libros para donar" },
    description: {
      pt: "Separe pelo menos 3 livros que você já leu e doe para uma biblioteca, escola, geladeira literária ou alguém que vá ler.",
      en: "Set aside at least 3 books you've already read and donate them to a library, school, little free library or someone who will read them.",
      es: "Separa al menos 3 libros que ya leíste y dónalos a una biblioteca, escuela, biblioteca libre o alguien que los vaya a leer.",
    },
    context: {
      pt: "Coloque os livros lado a lado com a capa para cima e fotografe todos de cima.",
      en: "Lay the books side by side, covers up, and photograph them all from above.",
      es: "Coloca los libros uno al lado de otro con la portada hacia arriba y fotografíalos todos desde arriba.",
    },
    impact: {
      pt: "Um livro parado na estante pode ensinar muita gente: doar dá uma nova vida ao papel.",
      en: "A book sitting on a shelf could teach many people: donating gives the paper a new life.",
      es: "Un libro quieto en la estantería puede enseñar a mucha gente: donarlo le da una nueva vida al papel.",
    },
    aiChecklist: "livros lado a lado com a capa para cima, todos visíveis para contar",
    category: "donation",
    proofType: "count",
    countItem: "book",
    countTarget: 3,
    points: 15,
  },
  {
    key: "reusable-bag",
    title: { pt: "Faça compras com sacola retornável", en: "Shop with a reusable bag", es: "Compra con una bolsa reutilizable" },
    description: {
      pt: "Vá ao mercado, feira ou padaria com a sua sacola retornável (de pano, ráfia ou mochila) e recuse a sacola plástica.",
      en: "Go to the supermarket, market or bakery with your own reusable bag (cloth, woven or a backpack) and say no to the plastic bag.",
      es: "Ve al supermercado, feria o panadería con tu bolsa reutilizable (de tela, rafia o una mochila) y rechaza la bolsa plástica.",
    },
    context: {
      pt: "Fotografe a sacola retornável com as compras dentro, ainda no mercado, na feira ou no caixa.",
      en: "Photograph the reusable bag with your shopping inside, still at the shop, market or checkout.",
      es: "Fotografía la bolsa reutilizable con las compras adentro, todavía en la tienda, la feria o la caja.",
    },
    impact: {
      pt: "Uma sacola plástica é usada por minutos e pode levar centenas de anos para se decompor.",
      en: "A plastic bag is used for minutes and can take hundreds of years to break down.",
      es: "Una bolsa plástica se usa por minutos y puede tardar cientos de años en descomponerse.",
    },
    aiChecklist: "sacola retornável (pano, ráfia ou mochila) com compras dentro, num mercado, feira ou caixa; sem sacolas plásticas descartáveis",
    category: "other",
    proofType: "photo",
    points: 10,
  },
];
