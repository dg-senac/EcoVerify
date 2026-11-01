/**
 * Daily quiz (Quiz do dia): 5 short questions about waste, recycling and the environment, the same
 * for everybody on the same day (Brasília time). Each answer shows a short explanation: the quiz is
 * education, so it gives few points and only once per day. Nobody can farm it: one attempt per
 * person per day, answers are checked on the server (web) and stored one by one.
 *
 * Pure module: shared by the web app and the APK.
 */
import { tx, type Lang } from "@/lib/i18n";

type Text3 = { pt: string; en: string; es: string };

export type QuizQuestion = {
  id: string;
  q: Text3;
  /** The first option is the right one (options are shuffled per day). */
  options: [Text3, Text3, Text3, Text3];
  explain: Text3;
};

export const QUIZ_SIZE = 5;
export const QUIZ_POINTS_PER_CORRECT = 2;
export const QUIZ_PERFECT_BONUS = 2;
export const QUIZ_MAX_POINTS = QUIZ_SIZE * QUIZ_POINTS_PER_CORRECT + QUIZ_PERFECT_BONUS;

const t3 = (pt: string, en: string, es: string): Text3 => ({ pt, en, es });

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "color-paper",
    q: t3("Na coleta seletiva, qual é a cor da lixeira de papel e papelão?", "In selective collection in Brazil, which bin colour is for paper and cardboard?", "En la recolección selectiva de Brasil, ¿de qué color es el contenedor de papel y cartón?"),
    options: [t3("Azul", "Blue", "Azul"), t3("Verde", "Green", "Verde"), t3("Amarela", "Yellow", "Amarillo"), t3("Vermelha", "Red", "Rojo")],
    explain: t3("Pelo padrão brasileiro de cores (Resolução CONAMA 275/2001), papel e papelão vão na lixeira azul.", "Under the Brazilian colour code (CONAMA Resolution 275/2001), paper and cardboard go in the blue bin.", "Según el código de colores brasileño (Resolución CONAMA 275/2001), el papel y el cartón van en el contenedor azul."),
  },
  {
    id: "color-plastic",
    q: t3("E a lixeira de plástico, qual é a cor?", "And which colour is the plastic bin?", "¿Y de qué color es el contenedor de plástico?"),
    options: [t3("Vermelha", "Red", "Rojo"), t3("Azul", "Blue", "Azul"), t3("Marrom", "Brown", "Marrón"), t3("Verde", "Green", "Verde")],
    explain: t3("Plástico vai na lixeira vermelha: garrafas, potes, sacolas e tampinhas.", "Plastic goes in the red bin: bottles, tubs, bags and caps.", "El plástico va en el contenedor rojo: botellas, envases, bolsas y tapitas."),
  },
  {
    id: "color-glass",
    q: t3("Qual cor de lixeira é usada para vidro?", "Which bin colour is used for glass?", "¿Qué color de contenedor se usa para el vidrio?"),
    options: [t3("Verde", "Green", "Verde"), t3("Amarela", "Yellow", "Amarillo"), t3("Cinza", "Grey", "Gris"), t3("Azul", "Blue", "Azul")],
    explain: t3("Vidro vai na lixeira verde. Embrulhe cacos em jornal para proteger quem faz a coleta.", "Glass goes in the green bin. Wrap broken glass in newspaper to protect the collectors.", "El vidrio va en el contenedor verde. Envuelve los vidrios rotos en papel para proteger a quien recolecta."),
  },
  {
    id: "color-metal",
    q: t3("Latinhas e outros metais vão em qual lixeira?", "Cans and other metals go in which bin?", "¿En qué contenedor van las latas y otros metales?"),
    options: [t3("Amarela", "Yellow", "Amarillo"), t3("Vermelha", "Red", "Rojo"), t3("Verde", "Green", "Verde"), t3("Marrom", "Brown", "Marrón")],
    explain: t3("Metal vai na lixeira amarela. Amassar as latinhas economiza espaço.", "Metal goes in the yellow bin. Crushing cans saves space.", "El metal va en el contenedor amarillo. Aplastar las latas ahorra espacio."),
  },
  {
    id: "color-organic",
    q: t3("Restos de comida e cascas vão na lixeira de qual cor?", "Food scraps and peels go in which bin colour?", "¿Los restos de comida y cáscaras van en el contenedor de qué color?"),
    options: [t3("Marrom", "Brown", "Marrón"), t3("Azul", "Blue", "Azul"), t3("Amarela", "Yellow", "Amarillo"), t3("Vermelha", "Red", "Rojo")],
    explain: t3("Resíduo orgânico vai na lixeira marrom e pode virar adubo na compostagem.", "Organic waste goes in the brown bin and can become fertiliser through composting.", "Los residuos orgánicos van en el contenedor marrón y pueden convertirse en abono con el compostaje."),
  },
  {
    id: "batteries",
    q: t3("Onde descartar pilhas e baterias usadas?", "Where should used batteries go?", "¿Dónde se desechan las pilas y baterías usadas?"),
    options: [
      t3("Em pontos de coleta específicos (mercados, lojas)", "At dedicated collection points (supermarkets, shops)", "En puntos de recolección específicos (supermercados, tiendas)"),
      t3("No lixo comum", "In the regular bin", "En la basura común"),
      t3("Junto com as latinhas", "Together with the cans", "Junto con las latas"),
      t3("Enterradas no quintal", "Buried in the garden", "Enterradas en el patio"),
    ],
    explain: t3("Pilhas têm metais pesados que contaminam solo e água. Elas fazem parte da logística reversa: quem vende deve receber de volta.", "Batteries contain heavy metals that pollute soil and water. They are part of reverse logistics: shops that sell them must take them back.", "Las pilas tienen metales pesados que contaminan el suelo y el agua. Forman parte de la logística inversa: quien vende debe recibirlas de vuelta."),
  },
  {
    id: "cooking-oil",
    q: t3("O que fazer com o óleo de cozinha usado?", "What should you do with used cooking oil?", "¿Qué hacer con el aceite de cocina usado?"),
    options: [
      t3("Guardar numa garrafa fechada e levar a um ponto de coleta", "Keep it in a closed bottle and take it to a collection point", "Guardarlo en una botella cerrada y llevarlo a un punto de recolección"),
      t3("Jogar na pia com água quente", "Pour it down the sink with hot water", "Tirarlo por el fregadero con agua caliente"),
      t3("Jogar no vaso sanitário", "Flush it down the toilet", "Tirarlo por el inodoro"),
      t3("Jogar na terra do jardim", "Pour it on the garden soil", "Echarlo en la tierra del jardín"),
    ],
    explain: t3("Na pia ou no vaso, o óleo entope canos e polui rios. Levado a um ponto de coleta, vira sabão ou biodiesel.", "Down the sink or toilet, oil clogs pipes and pollutes rivers. At a collection point it becomes soap or biodiesel.", "Por el fregadero o el inodoro, el aceite tapa las cañerías y contamina los ríos. En un punto de recolección se convierte en jabón o biodiésel."),
  },
  {
    id: "pizza-box",
    q: t3("Caixa de pizza suja de gordura pode ir para a reciclagem de papel?", "Can a greasy pizza box go in paper recycling?", "¿Una caja de pizza con grasa puede ir al reciclaje de papel?"),
    options: [
      t3("Não: a parte engordurada vai no lixo comum; só as partes limpas são recicláveis", "No: the greasy part goes in the regular bin; only clean parts are recyclable", "No: la parte con grasa va a la basura común; solo las partes limpias se reciclan"),
      t3("Sim, inteira, do jeito que está", "Yes, whole, as it is", "Sí, entera, tal como está"),
      t3("Só se for lavada com água", "Only if washed with water", "Solo si se lava con agua"),
      t3("Vai na lixeira de plástico", "It goes in the plastic bin", "Va en el contenedor de plástico"),
    ],
    explain: t3("Gordura atrapalha a reciclagem do papel. Corte e separe a tampa limpa; o fundo sujo vai no lixo comum.", "Grease spoils paper recycling. Cut off and keep the clean lid; the greasy bottom goes in the regular bin.", "La grasa estropea el reciclaje del papel. Corta y separa la tapa limpia; el fondo sucio va a la basura común."),
  },
  {
    id: "glass-times",
    q: t3("Quantas vezes o vidro pode ser reciclado?", "How many times can glass be recycled?", "¿Cuántas veces se puede reciclar el vidrio?"),
    options: [t3("Infinitas vezes, sem perder qualidade", "Endlessly, without losing quality", "Infinitas veces, sin perder calidad"), t3("Só uma vez", "Only once", "Solo una vez"), t3("Três vezes", "Three times", "Tres veces"), t3("Nenhuma", "Never", "Ninguna")],
    explain: t3("O vidro é derretido e volta a ser vidro quantas vezes for preciso, sem perder qualidade.", "Glass is melted and becomes glass again as many times as needed, without losing quality.", "El vidrio se funde y vuelve a ser vidrio tantas veces como haga falta, sin perder calidad."),
  },
  {
    id: "pnrs-year",
    q: t3("Em que ano foi criada a Política Nacional de Resíduos Sólidos (Lei 12.305)?", "In which year was Brazil's National Solid Waste Policy (Law 12,305) created?", "¿En qué año se creó la Política Nacional de Residuos Sólidos de Brasil (Ley 12.305)?"),
    options: [t3("2010", "2010", "2010"), t3("1988", "1988", "1988"), t3("2000", "2000", "2000"), t3("2020", "2020", "2020")],
    explain: t3("A Lei 12.305/2010 organiza a gestão do lixo no Brasil: coleta seletiva, logística reversa e fim dos lixões.", "Law 12,305/2010 organises waste management in Brazil: selective collection, reverse logistics and the end of open dumps.", "La Ley 12.305/2010 organiza la gestión de residuos en Brasil: recolección selectiva, logística inversa y el fin de los vertederos a cielo abierto."),
  },
  {
    id: "reverse-logistics",
    q: t3("O que é logística reversa?", "What is reverse logistics?", "¿Qué es la logística inversa?"),
    options: [
      t3("Fabricantes e lojas recebem de volta produtos usados para dar o destino certo", "Manufacturers and shops take back used products to dispose of them properly", "Fabricantes y tiendas reciben de vuelta productos usados para darles el destino correcto"),
      t3("Entregar compras de volta para a loja", "Returning purchases to the shop", "Devolver compras a la tienda"),
      t3("Levar o lixo para outra cidade", "Taking waste to another city", "Llevar la basura a otra ciudad"),
      t3("Separar o lixo em casa", "Sorting waste at home", "Separar la basura en casa"),
    ],
    explain: t3("Pilhas, pneus, eletrônicos, lâmpadas, embalagens de agrotóxico e remédios têm logística reversa: o produto volta para quem o produziu.", "Batteries, tyres, electronics, lamps, pesticide packaging and medicines have reverse logistics: the product goes back to whoever made it.", "Pilas, neumáticos, electrónicos, lámparas, envases de agroquímicos y medicamentos tienen logística inversa: el producto vuelve a quien lo fabricó."),
  },
  {
    id: "fluorescent",
    q: t3("Por que lâmpadas fluorescentes não devem ir no lixo comum?", "Why shouldn't fluorescent lamps go in the regular bin?", "¿Por qué las lámparas fluorescentes no deben ir a la basura común?"),
    options: [
      t3("Porque contêm mercúrio, que é tóxico", "Because they contain mercury, which is toxic", "Porque contienen mercurio, que es tóxico"),
      t3("Porque são muito pesadas", "Because they are very heavy", "Porque son muy pesadas"),
      t3("Porque valem dinheiro", "Because they are worth money", "Porque valen dinero"),
      t3("Não há problema, podem ir", "There's no problem, they can", "No hay problema, pueden ir"),
    ],
    explain: t3("O mercúrio contamina quem manuseia o lixo e o ambiente. Leve a lâmpada a um ponto de coleta.", "Mercury harms waste workers and the environment. Take the lamp to a collection point.", "El mercurio daña a quien manipula la basura y al ambiente. Lleva la lámpara a un punto de recolección."),
  },
  {
    id: "medicines",
    q: t3("O que fazer com remédios vencidos?", "What should you do with expired medicines?", "¿Qué hacer con los medicamentos vencidos?"),
    options: [
      t3("Devolver numa farmácia com coletor", "Return them to a pharmacy with a collection bin", "Devolverlos en una farmacia con contenedor"),
      t3("Jogar no vaso sanitário", "Flush them down the toilet", "Tirarlos por el inodoro"),
      t3("Jogar no lixo reciclável", "Put them in the recycling bin", "Tirarlos al reciclable"),
      t3("Guardar para sempre", "Keep them forever", "Guardarlos para siempre"),
    ],
    explain: t3("Remédios na água ou no solo contaminam o ambiente. Muitas farmácias têm coletores (logística reversa de medicamentos).", "Medicines in water or soil pollute the environment. Many pharmacies have collection bins (medicine reverse logistics).", "Los medicamentos en el agua o el suelo contaminan el ambiente. Muchas farmacias tienen contenedores (logística inversa de medicamentos)."),
  },
  {
    id: "carton",
    q: t3("Caixa de leite longa vida é reciclável?", "Are long-life milk cartons recyclable?", "¿Las cajas de leche larga vida son reciclables?"),
    options: [
      t3("Sim: vai no reciclável, de preferência vazia e aberta", "Yes: it goes in recycling, ideally empty and flattened", "Sí: va al reciclable, mejor vacía y aplastada"),
      t3("Não, nunca", "No, never", "No, nunca"),
      t3("Só a tampinha", "Only the cap", "Solo la tapita"),
      t3("Só se for de suco", "Only juice cartons", "Solo si es de jugo"),
    ],
    explain: t3("A embalagem tem papel, plástico e alumínio, que são separados na reciclagem.", "The carton has paper, plastic and aluminium, which are separated during recycling.", "El envase tiene papel, plástico y aluminio, que se separan en el reciclaje."),
  },
  {
    id: "mirror",
    q: t3("Espelho quebrado vai junto com o vidro reciclável?", "Does a broken mirror go with recyclable glass?", "¿Un espejo roto va con el vidrio reciclable?"),
    options: [
      t3("Não: o espelho tem uma camada metálica e não é reciclado com o vidro comum", "No: mirrors have a metal coating and aren't recycled with regular glass", "No: el espejo tiene una capa metálica y no se recicla con el vidrio común"),
      t3("Sim, é igual a uma garrafa", "Yes, it's the same as a bottle", "Sí, es igual que una botella"),
      t3("Vai no metal", "It goes with metal", "Va con el metal"),
      t3("Vai no orgânico", "It goes with organic waste", "Va con lo orgánico"),
    ],
    explain: t3("Embrulhe bem o espelho (para ninguém se cortar) e descarte no lixo comum ou num ecoponto.", "Wrap the mirror well (so nobody gets cut) and put it in the regular bin or at a drop-off point.", "Envuelve bien el espejo (para que nadie se corte) y deséchalo en la basura común o en un ecopunto."),
  },
  {
    id: "eps",
    q: t3("O isopor é reciclável?", "Is styrofoam recyclable?", "¿El poliestireno (telgopor) es reciclable?"),
    options: [
      t3("Sim, é um tipo de plástico; separe limpo para o reciclável", "Yes, it's a kind of plastic; keep it clean for recycling", "Sí, es un tipo de plástico; sepáralo limpio para el reciclable"),
      t3("Não, é orgânico", "No, it's organic", "No, es orgánico"),
      t3("Só se for queimado antes", "Only if burned first", "Solo si se quema antes"),
      t3("É vidro", "It's glass", "Es vidrio"),
    ],
    explain: t3("O isopor (EPS) é plástico e pode ser reciclado. Nem toda cidade recolhe, mas cooperativas e ecopontos costumam aceitar.", "Styrofoam (EPS) is plastic and can be recycled. Not every city collects it, but cooperatives and drop-off points often accept it.", "El poliestireno (EPS) es plástico y se puede reciclar. No todas las ciudades lo recogen, pero cooperativas y ecopuntos suelen aceptarlo."),
  },
  {
    id: "three-rs",
    q: t3("Qual é a ordem mais sustentável dos 3 Rs?", "What is the most sustainable order of the 3 Rs?", "¿Cuál es el orden más sostenible de las 3 R?"),
    options: [
      t3("Reduzir, reutilizar, reciclar", "Reduce, reuse, recycle", "Reducir, reutilizar, reciclar"),
      t3("Reciclar, reduzir, reutilizar", "Recycle, reduce, reuse", "Reciclar, reducir, reutilizar"),
      t3("Reutilizar, reciclar, reduzir", "Reuse, recycle, reduce", "Reutilizar, reciclar, reducir"),
      t3("Tanto faz", "It doesn't matter", "Da igual"),
    ],
    explain: t3("O melhor lixo é o que não existe: primeiro reduza, depois reutilize e, por fim, recicle.", "The best waste is the waste that never exists: reduce first, then reuse, and recycle last.", "La mejor basura es la que no existe: primero reduce, después reutiliza y, al final, recicla."),
  },
  {
    id: "compost",
    q: t3("A compostagem transforma o quê em adubo?", "Composting turns what into fertiliser?", "¿El compostaje convierte qué en abono?"),
    options: [t3("Resíduos orgânicos", "Organic waste", "Residuos orgánicos"), t3("Plástico", "Plastic", "Plástico"), t3("Vidro", "Glass", "Vidrio"), t3("Pilhas", "Batteries", "Pilas")],
    explain: t3("Cascas, restos de verduras, borra de café e folhas secas viram adubo e deixam de ir para o aterro.", "Peels, vegetable scraps, coffee grounds and dry leaves become fertiliser instead of going to landfill.", "Cáscaras, restos de verduras, borra de café y hojas secas se convierten en abono en lugar de ir al relleno sanitario."),
  },
  {
    id: "aedes",
    q: t3("Lixo acumulado que junta água parada pode virar foco de quê?", "Piled-up waste that collects standing water can breed what?", "¿La basura acumulada que junta agua estancada puede convertirse en foco de qué?"),
    options: [
      t3("Do mosquito Aedes aegypti (dengue, zika e chikungunya)", "The Aedes aegypti mosquito (dengue, zika and chikungunya)", "El mosquito Aedes aegypti (dengue, zika y chikungunya)"),
      t3("De abelhas", "Bees", "Abejas"),
      t3("De nada, é inofensivo", "Nothing, it's harmless", "De nada, es inofensivo"),
      t3("De peixes", "Fish", "Peces"),
    ],
    explain: t3("Pneus, garrafas e entulho com água parada são criadouros do mosquito. Por isso pontos de lixo irregular são um risco à saúde.", "Tyres, bottles and rubble holding water are mosquito breeding sites. That is why illegal dumping spots are a health risk.", "Neumáticos, botellas y escombros con agua son criaderos del mosquito. Por eso los basurales irregulares son un riesgo para la salud."),
  },
  {
    id: "burning",
    q: t3("Pode queimar lixo no quintal ou num terreno?", "Is it OK to burn waste in a yard or empty lot?", "¿Se puede quemar basura en el patio o en un terreno?"),
    options: [
      t3("Não: é proibido e solta fumaça tóxica", "No: it is forbidden and releases toxic smoke", "No: está prohibido y suelta humo tóxico"),
      t3("Sim, se for só plástico", "Yes, if it's only plastic", "Sí, si es solo plástico"),
      t3("Sim, à noite", "Yes, at night", "Sí, de noche"),
      t3("Sim, em dias de chuva", "Yes, on rainy days", "Sí, en días de lluvia"),
    ],
    explain: t3("A Política Nacional de Resíduos Sólidos proíbe a queima de lixo a céu aberto. A fumaça faz mal à saúde de toda a vizinhança.", "Brazil's National Solid Waste Policy forbids open burning of waste. The smoke harms the health of the whole neighbourhood.", "La Política Nacional de Residuos Sólidos de Brasil prohíbe la quema de basura a cielo abierto. El humo daña la salud de todo el barrio."),
  },
  {
    id: "e-waste",
    q: t3("Onde descartar um celular velho que não funciona?", "Where should an old broken phone go?", "¿Dónde desechar un celular viejo que no funciona?"),
    options: [
      t3("Num ponto de coleta de eletrônicos", "At an electronics collection point", "En un punto de recolección de electrónicos"),
      t3("No lixo comum", "In the regular bin", "En la basura común"),
      t3("Na lixeira de plástico", "In the plastic bin", "En el contenedor de plástico"),
      t3("No orgânico", "In organic waste", "En lo orgánico"),
    ],
    explain: t3("Eletrônicos têm metais valiosos e substâncias tóxicas. Lojas e ecopontos recebem para reciclar (apague seus dados antes!).", "Electronics contain valuable metals and toxic substances. Shops and drop-off points take them for recycling (wipe your data first!).", "Los electrónicos tienen metales valiosos y sustancias tóxicas. Tiendas y ecopuntos los reciben para reciclar (¡borra tus datos antes!)."),
  },
  {
    id: "rinse",
    q: t3("Antes de colocar embalagens no reciclável, o ideal é:", "Before putting packaging in recycling, it is best to:", "Antes de poner envases en el reciclable, lo ideal es:"),
    options: [
      t3("Esvaziar e dar uma enxaguada rápida", "Empty them and give them a quick rinse", "Vaciarlos y enjuagarlos rápido"),
      t3("Deixar com restos de comida", "Leave food leftovers in them", "Dejarlos con restos de comida"),
      t3("Lavar com muito sabão por vários minutos", "Wash them with lots of soap for several minutes", "Lavarlos con mucho jabón varios minutos"),
      t3("Queimar o rótulo", "Burn the label", "Quemar la etiqueta"),
    ],
    explain: t3("Restos de comida sujam os outros materiais e atraem bichos. Uma enxaguada rápida basta, sem desperdiçar água.", "Food leftovers soil other materials and attract pests. A quick rinse is enough, without wasting water.", "Los restos de comida ensucian otros materiales y atraen plagas. Un enjuague rápido basta, sin desperdiciar agua."),
  },
  {
    id: "waste-pickers",
    q: t3("Por que separar bem o reciclável ajuda os catadores?", "Why does sorting recyclables well help waste pickers?", "¿Por qué separar bien los reciclables ayuda a los recicladores?"),
    options: [
      t3("Material limpo e separado vale mais e é mais seguro de manusear", "Clean, sorted material is worth more and is safer to handle", "El material limpio y separado vale más y es más seguro de manipular"),
      t3("Não faz diferença para eles", "It makes no difference to them", "No hace diferencia para ellos"),
      t3("Porque eles não trabalham com reciclagem", "Because they don't work with recycling", "Porque ellos no trabajan con reciclaje"),
      t3("Porque o lixo misturado vale mais", "Because mixed waste is worth more", "Porque la basura mezclada vale más"),
    ],
    explain: t3("Catadores e cooperativas fazem boa parte da reciclagem no Brasil. Separar bem aumenta a renda e evita cortes e contaminação.", "Waste pickers and cooperatives do a large share of recycling in Brazil. Good sorting raises their income and avoids cuts and contamination.", "Los recicladores y cooperativas hacen buena parte del reciclaje en Brasil. Separar bien aumenta sus ingresos y evita cortes y contaminación."),
  },
  {
    id: "mangroves",
    q: t3("Qual é a importância dos manguezais, como os de Recife?", "Why are mangroves, like Recife's, important?", "¿Cuál es la importancia de los manglares, como los de Recife?"),
    options: [
      t3("São berçário de peixes e caranguejos e protegem a costa", "They are nurseries for fish and crabs and protect the coast", "Son criadero de peces y cangrejos y protegen la costa"),
      t3("Nenhuma, são áreas sem vida", "None, they are lifeless areas", "Ninguna, son áreas sin vida"),
      t3("Servem como depósito de lixo", "They serve as dumping grounds", "Sirven como depósito de basura"),
      t3("Só servem para turismo", "They are only for tourism", "Solo sirven para el turismo"),
    ],
    explain: t3("O mangue abriga muitas espécies, filtra a água e segura a erosão. Lixo jogado em canais e rios acaba nele.", "Mangroves shelter many species, filter water and hold back erosion. Litter thrown into canals and rivers ends up there.", "El manglar alberga muchas especies, filtra el agua y frena la erosión. La basura tirada en canales y ríos termina allí."),
  },
  {
    id: "caps",
    q: t3("Tampinhas de garrafa plástica são recicláveis?", "Are plastic bottle caps recyclable?", "¿Las tapitas de botellas plásticas son reciclables?"),
    options: [t3("Sim, são plástico", "Yes, they are plastic", "Sí, son plástico"), t3("Não", "No", "No"), t3("Só as de metal", "Only metal ones", "Solo las de metal"), t3("Só se pintadas", "Only if painted", "Solo si están pintadas")],
    explain: t3("Tampinhas são de plástico e vão no reciclável. Muitas campanhas juntam tampinhas para ajudar instituições.", "Caps are plastic and go in recycling. Many campaigns collect caps to help charities.", "Las tapitas son de plástico y van al reciclable. Muchas campañas juntan tapitas para ayudar a instituciones."),
  },
  {
    id: "rubble",
    q: t3("Para onde deve ir o entulho de uma pequena reforma?", "Where should rubble from a small renovation go?", "¿Adónde deben ir los escombros de una pequeña reforma?"),
    options: [
      t3("Para um ecoponto ou uma caçamba autorizada", "To a drop-off point or an authorised skip", "A un ecopunto o un contenedor autorizado"),
      t3("Para a calçada", "The pavement", "A la vereda"),
      t3("Para um terreno baldio", "An empty lot", "A un terreno baldío"),
      t3("Para o canal mais próximo", "The nearest canal", "Al canal más cercano"),
    ],
    explain: t3("Entulho na rua ou em terrenos é descarte irregular: atrai bichos, entope bueiros e pode dar multa. Muitas prefeituras têm ecopontos.", "Rubble on the street or in empty lots is illegal dumping: it attracts pests, blocks drains and can be fined. Many cities have drop-off points.", "Los escombros en la calle o en terrenos son descarte irregular: atraen plagas, tapan desagües y pueden multarse. Muchas ciudades tienen ecopuntos."),
  },
  {
    id: "turtles",
    q: t3("Por que sacolas plásticas no mar são tão perigosas para tartarugas?", "Why are plastic bags in the sea so dangerous for turtles?", "¿Por qué las bolsas plásticas en el mar son tan peligrosas para las tortugas?"),
    options: [
      t3("Elas confundem a sacola com água-viva e engolem", "They mistake the bag for a jellyfish and swallow it", "Confunden la bolsa con una medusa y se la tragan"),
      t3("As sacolas esquentam a água", "The bags heat the water", "Las bolsas calientan el agua"),
      t3("Não são perigosas", "They aren't dangerous", "No son peligrosas"),
      t3("Elas usam as sacolas como casa", "They use the bags as homes", "Usan las bolsas como casa"),
    ],
    explain: t3("O plástico engolido bloqueia o estômago do animal. Lixo deixado na praia ou nos canais chega ao mar.", "Swallowed plastic blocks the animal's stomach. Litter left on the beach or in canals reaches the sea.", "El plástico tragado bloquea el estómago del animal. La basura dejada en la playa o en los canales llega al mar."),
  },
  {
    id: "native-trees",
    q: t3("Ao plantar uma árvore, qual é em geral a melhor escolha?", "When planting a tree, what is usually the best choice?", "Al plantar un árbol, ¿cuál suele ser la mejor opción?"),
    options: [
      t3("Uma espécie nativa da região", "A species native to the region", "Una especie nativa de la región"),
      t3("Qualquer espécie exótica", "Any exotic species", "Cualquier especie exótica"),
      t3("A que cresce mais rápido, sempre", "Always the fastest-growing one", "Siempre la que crece más rápido"),
      t3("Tanto faz", "It doesn't matter", "Da igual"),
    ],
    explain: t3("Espécies nativas estão adaptadas ao clima e alimentam a fauna local, como pássaros e abelhas.", "Native species are adapted to the climate and feed local wildlife such as birds and bees.", "Las especies nativas están adaptadas al clima y alimentan a la fauna local, como aves y abejas."),
  },
  {
    id: "cigarette",
    q: t3("Onde deve ir a bituca de cigarro?", "Where should a cigarette butt go?", "¿Dónde debe ir la colilla de cigarrillo?"),
    options: [
      t3("No lixo comum, nunca no chão ou na areia", "In the regular bin, never on the ground or the sand", "En la basura común, nunca en el suelo o la arena"),
      t3("No chão, porque se decompõe rápido", "On the ground, because it breaks down fast", "En el suelo, porque se descompone rápido"),
      t3("No reciclável de papel", "In paper recycling", "En el reciclable de papel"),
      t3("No bueiro", "Down the drain", "En la alcantarilla"),
    ],
    explain: t3("O filtro tem plástico e substâncias tóxicas. Bitucas no chão vão para bueiros, rios e o mar.", "The filter contains plastic and toxic substances. Butts on the ground end up in drains, rivers and the sea.", "El filtro tiene plástico y sustancias tóxicas. Las colillas en el suelo terminan en desagües, ríos y el mar."),
  },
  {
    id: "cans-brazil",
    q: t3("Como o Brasil se sai na reciclagem de latinhas de alumínio?", "How does Brazil do at recycling aluminium cans?", "¿Cómo le va a Brasil en el reciclaje de latas de aluminio?"),
    options: [
      t3("É um dos líderes mundiais: quase todas as latas voltam a ser latas", "It's one of the world leaders: almost every can becomes a can again", "Es uno de los líderes mundiales: casi todas las latas vuelven a ser latas"),
      t3("Quase não recicla latas", "It hardly recycles cans", "Casi no recicla latas"),
      t3("Recicla só metade", "It recycles only half", "Recicla solo la mitad"),
      t3("Latas não são recicláveis", "Cans aren't recyclable", "Las latas no son reciclables"),
    ],
    explain: t3("A reciclagem de latinhas é uma das maiores fontes de renda dos catadores e uma lata pode voltar à prateleira em poucas semanas.", "Can recycling is one of the biggest sources of income for waste pickers, and a can may be back on the shelf within weeks.", "El reciclaje de latas es una de las mayores fuentes de ingresos de los recicladores, y una lata puede volver al estante en pocas semanas."),
  },
  {
    id: "toilet-paper",
    q: t3("Papel higiênico usado vai em qual lixo?", "Which bin does used toilet paper go in?", "¿En qué basura va el papel higiénico usado?"),
    options: [t3("No lixo comum (não reciclável)", "The regular bin (not recyclable)", "En la basura común (no reciclable)"), t3("No reciclável de papel", "Paper recycling", "En el reciclable de papel"), t3("No vidro", "Glass", "En el vidrio"), t3("No metal", "Metal", "En el metal")],
    explain: t3("Papel sujo ou úmido (higiênico, guardanapo usado) não é reciclável e contamina o papel limpo.", "Dirty or wet paper (toilet paper, used napkins) isn't recyclable and contaminates clean paper.", "El papel sucio o húmedo (higiénico, servilletas usadas) no se recicla y contamina el papel limpio."),
  },
];

/* ------------------------------------------------------------------ */
/* Daily selection                                                     */
/* ------------------------------------------------------------------ */

/** Quiz day in Brasília time (UTC-3, no daylight saving), e.g. "2026-10-31". */
export function quizDay(now: Date = new Date()): string {
  return new Date(now.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export function isQuizDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type DailyQuestion = { question: QuizQuestion; order: number[]; correctIndex: number };

/** The day's questions, with the displayed order of the options and where the right one ended up. */
export function dailyQuiz(day: string): DailyQuestion[] {
  const picked = shuffle(QUIZ_QUESTIONS, rng(hash(`quiz:${day}`))).slice(0, QUIZ_SIZE);
  return picked.map((question) => {
    const order = shuffle([0, 1, 2, 3], rng(hash(`${day}:${question.id}`)));
    return { question, order, correctIndex: order.indexOf(0) };
  });
}

/** What the browser gets: texts only, no answer. */
export type ClientQuestion = { id: string; text: string; options: string[] };

export function quizForClient(day: string, lang: Lang): ClientQuestion[] {
  return dailyQuiz(day).map(({ question, order }) => ({
    id: question.id,
    text: question.q[lang],
    options: order.map((i) => question.options[i][lang]),
  }));
}

export type QuizAnswerResult = { correct: boolean; correctIndex: number; explanation: string };

export function checkQuizAnswer(day: string, index: number, choice: number, lang: Lang): QuizAnswerResult | null {
  const item = dailyQuiz(day)[index];
  if (!item || !Number.isInteger(choice) || choice < 0 || choice > 3) return null;
  return { correct: choice === item.correctIndex, correctIndex: item.correctIndex, explanation: item.question.explain[lang] };
}

export type QuizAnswerResponse =
  | { error: "not_allowed" | "invalid" | "too_many" | "new_day" }
  | (QuizAnswerResult & { finished?: { correct: number; points: number } });

export function quizPoints(correct: number): number {
  return correct * QUIZ_POINTS_PER_CORRECT + (correct === QUIZ_SIZE ? QUIZ_PERFECT_BONUS : 0);
}

/** Results of the answers already given (for a reload in the middle of the quiz). */
export function answeredResults(day: string, answers: number[], lang: Lang): (QuizAnswerResult & { choice: number })[] {
  return answers.flatMap((choice, i) => {
    const r = checkQuizAnswer(day, i, choice, lang);
    return r ? [{ ...r, choice }] : [];
  });
}

export function quizText(lang: Lang) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  return {
    title: T("Quiz do dia", "Daily quiz", "Quiz del día"),
    intro: T(
      `${QUIZ_SIZE} perguntas rápidas sobre lixo, reciclagem e meio ambiente. Cada acerto vale ${QUIZ_POINTS_PER_CORRECT} pontos e acertar todas dá +${QUIZ_PERFECT_BONUS}. Uma tentativa por dia; amanhã tem perguntas novas.`,
      `${QUIZ_SIZE} quick questions about waste, recycling and the environment. Each right answer is worth ${QUIZ_POINTS_PER_CORRECT} points and getting them all right gives +${QUIZ_PERFECT_BONUS}. One try per day; new questions tomorrow.`,
      `${QUIZ_SIZE} preguntas rápidas sobre basura, reciclaje y medio ambiente. Cada acierto vale ${QUIZ_POINTS_PER_CORRECT} puntos y acertar todas da +${QUIZ_PERFECT_BONUS}. Un intento por día; mañana hay preguntas nuevas.`,
    ),
    question: (n: number) => T(`Pergunta ${n} de ${QUIZ_SIZE}`, `Question ${n} of ${QUIZ_SIZE}`, `Pregunta ${n} de ${QUIZ_SIZE}`),
    right: T("Certo! ✓", "Correct! ✓", "¡Correcto! ✓"),
    wrong: T("Não foi dessa vez", "Not this time", "Esta vez no"),
    next: T("Próxima pergunta", "Next question", "Siguiente pregunta"),
    finish: T("Ver resultado", "See result", "Ver resultado"),
    done: (correct: number, points: number) =>
      T(`Você acertou ${correct} de ${QUIZ_SIZE} e ganhou ${points} pontos.`, `You got ${correct} of ${QUIZ_SIZE} right and earned ${points} points.`, `Acertaste ${correct} de ${QUIZ_SIZE} y ganaste ${points} puntos.`),
    perfect: T("Gabaritou! 🏆", "Perfect score! 🏆", "¡Todas correctas! 🏆"),
    comeBack: T("Volte amanhã para um quiz novo.", "Come back tomorrow for a new quiz.", "Vuelve mañana para un quiz nuevo."),
    cardTitle: T("🧠 Quiz do dia", "🧠 Daily quiz", "🧠 Quiz del día"),
    cardText: T(`${QUIZ_SIZE} perguntas · até ${QUIZ_MAX_POINTS} pontos`, `${QUIZ_SIZE} questions · up to ${QUIZ_MAX_POINTS} points`, `${QUIZ_SIZE} preguntas · hasta ${QUIZ_MAX_POINTS} puntos`),
    cardDone: (points: number) => T(`Feito hoje ✓ +${points} pontos`, `Done today ✓ +${points} points`, `Hecho hoy ✓ +${points} puntos`),
    play: T("Responder", "Play", "Responder"),
    error: T("Não foi possível salvar a resposta. Tente de novo.", "Could not save the answer. Try again.", "No se pudo guardar la respuesta. Inténtalo de nuevo."),
  };
}
