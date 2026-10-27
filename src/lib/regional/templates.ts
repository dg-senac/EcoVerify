/**
 * Templates for missions generated automatically from OpenStreetMap places.
 * Pure data: the texts are written for any city in Brazil.
 */
export type OsmKind = "beach" | "park" | "recycling" | "cooking_oil";

type Text3 = { pt: string; en: string; es: string };

export type MissionTemplate = {
  category: "cleanup" | "recycling";
  points: number;
  title: (place: string) => Text3;
  description: Text3;
  context: string;
  impact: string;
  aiChecklist: string;
  /** Name used when the OSM element has no name. */
  fallbackName: Text3;
};

export const OSM_TEMPLATES: Record<OsmKind, MissionTemplate> = {
  beach: {
    category: "cleanup",
    points: 40,
    title: (p) => ({ pt: `Limpeza na ${p}`, en: `Clean-up at ${p}`, es: `Limpieza en ${p}` }),
    description: {
      pt: "Recolha lixo da areia (plástico, tampinhas, bitucas) e descarte corretamente.",
      en: "Pick up litter from the sand (plastic, bottle caps, cigarette butts) and dispose of it properly.",
      es: "Recoge basura de la arena (plástico, tapitas, colillas) y deséchala correctamente.",
    },
    context: "Use luvas e fotografe os sacos com o lixo recolhido, com a praia ao fundo.",
    impact: "O lixo da praia vai para o mar e machuca tartarugas, peixes e aves.",
    aiChecklist: "Sacos ou recipientes com lixo recolhido na areia de uma praia; mar ou orla ao fundo.",
    fallbackName: { pt: "praia", en: "the beach", es: "la playa" },
  },
  park: {
    category: "cleanup",
    points: 30,
    title: (p) => ({ pt: `Mutirão de limpeza: ${p}`, en: `Clean-up drive: ${p}`, es: `Jornada de limpieza: ${p}` }),
    description: {
      pt: "Recolha o lixo espalhado pelo parque ou praça e separe o que for reciclável.",
      en: "Pick up the litter around the park or square and separate what can be recycled.",
      es: "Recoge la basura del parque o plaza y separa lo reciclable.",
    },
    context: "Fotografe os sacos com o lixo recolhido, com o parque ou a praça ao fundo.",
    impact: "Áreas verdes limpas são mais usadas pela comunidade e entopem menos os bueiros.",
    aiChecklist: "Sacos com lixo recolhido em um parque, praça ou área verde; árvores ou bancos ao fundo.",
    fallbackName: { pt: "praça do bairro", en: "local square", es: "plaza del barrio" },
  },
  recycling: {
    category: "recycling",
    points: 20,
    title: (p) => ({ pt: `Entregue recicláveis: ${p}`, en: `Drop off recyclables: ${p}`, es: `Entrega reciclables: ${p}` }),
    description: {
      pt: "Separe papel, plástico, vidro ou metal em casa (limpos e secos) e entregue neste ponto de coleta.",
      en: "Separate paper, plastic, glass or metal at home (clean and dry) and drop them off at this collection point.",
      es: "Separa papel, plástico, vidrio o metal en casa (limpios y secos) y entrégalos en este punto de recolección.",
    },
    context: "Fotografe os recicláveis sendo entregues no ponto de coleta ou no contêiner.",
    impact: "Material separado corretamente volta para a indústria em vez de ir para o lixão.",
    aiChecklist: "Recicláveis (garrafas, latas, papelão) sendo colocados em um contêiner ou ponto de coleta seletiva.",
    fallbackName: { pt: "ponto de coleta seletiva", en: "recycling point", es: "punto de reciclaje" },
  },
  cooking_oil: {
    category: "recycling",
    points: 25,
    title: (p) => ({ pt: `Entregue óleo de cozinha usado: ${p}`, en: `Drop off used cooking oil: ${p}`, es: `Entrega aceite de cocina usado: ${p}` }),
    description: {
      pt: "Junte o óleo de cozinha usado numa garrafa PET fechada e entregue no ponto de coleta.",
      en: "Collect used cooking oil in a closed plastic bottle and drop it off at the collection point.",
      es: "Junta el aceite de cocina usado en una botella cerrada y entrégalo en el punto de recolección.",
    },
    context: "Fotografe a garrafa com o óleo no ponto de coleta.",
    impact: "Um litro de óleo pode contaminar milhares de litros de água.",
    aiChecklist: "Garrafa com óleo de cozinha usado em um ponto de coleta.",
    fallbackName: { pt: "ponto de coleta de óleo", en: "oil collection point", es: "punto de recolección de aceite" },
  },
};
