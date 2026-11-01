/**
 * Seeds a development database with demo users and missions around Recife.
 *
 *   npm run db:push   # create tables
 *   npm run db:seed   # demo data
 *
 * Safe to run more than once (existing users/missions are skipped).
 * Refuses to run against production unless SEED_ALLOW_PRODUCTION=true.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq, inArray, isNull } from "drizzle-orm";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error("Refusing to seed in production (set SEED_ALLOW_PRODUCTION=true to override).");
  }

  const { db, pool } = await import("../src/db");
  const { collectionPoints, missions, sponsors, users } = await import("../src/db/schema");

  const password = process.env.SEED_PASSWORD || "ecoverify123";
  const passwordHash = await bcrypt.hash(password, 10);

  const demoUsers = [
    { name: "Admin EcoVerify", email: "admin@ecoverify.dev", role: "admin" as const },
    { name: "Moderador EcoVerify", email: "moderador@ecoverify.dev", role: "moderator" as const },
    { name: "Cidadã Demo", email: "cidada@ecoverify.dev", role: "citizen" as const },
  ];

  let adminId: string | undefined;
  for (const demo of demoUsers) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, demo.email)).limit(1);
    if (existing) {
      if (demo.role === "admin") adminId = existing.id;
      console.log(`• usuário já existe: ${demo.email}`);
      continue;
    }
    const { TERMS_VERSION } = await import("../src/lib/legal");
    const now = new Date();
    const [created] = await db
      .insert(users)
      .values({ ...demo, passwordHash, emailVerifiedAt: now, termsAcceptedAt: now, termsVersion: TERMS_VERSION }).returning({ id: users.id });
    if (demo.role === "admin") adminId = created.id;
    console.log(`✓ usuário criado: ${demo.email} (${demo.role})`);
  }

  const RECIFE = { scope: "local" as const, city: "Recife", stateCode: "PE", ibgeCode: 2611606 };
  const demoMissions = [
    {
      title: "Mutirão de limpeza na Praia de Boa Viagem",
      titleEn: "Beach cleanup at Boa Viagem",
      titleEs: "Limpieza de la playa de Boa Viagem",
      description: "Recolha pelo menos um saco de resíduos na faixa de areia e descarte corretamente.",
      descriptionEn: "Collect at least one bag of waste from the sand and dispose of it properly.",
      descriptionEs: "Recoge al menos una bolsa de residuos en la arena y deséchala correctamente.",
      context: "Leve luvas e sacos. Tire uma foto ANTES do trecho sujo e outra DEPOIS, do mesmo lugar, com os sacos cheios.",
      proofType: "before_after" as const,
      impact: "Resíduos plásticos na praia acabam no mar e afetam tartarugas e peixes.",
      latitude: "-8.119600",
      longitude: "-34.895600",
      ...RECIFE,
      category: "cleanup" as const,
      pointsReward: 50,
      foneReward: "25.00",
    },
    {
      title: "Plantio de muda no Parque da Jaqueira",
      titleEn: "Plant a seedling at Jaqueira Park",
      titleEs: "Plantar un plantón en el Parque da Jaqueira",
      description: "Participe da ação de plantio e registre a muda plantada.",
      descriptionEn: "Join the planting action and record the planted seedling.",
      descriptionEs: "Participa en la acción de plantación y registra el plantón.",
      context: "Plante a muda em área autorizada e fotografe com a placa de identificação.",
      proofType: "photo" as const,
      impact: "Árvores reduzem ilhas de calor e melhoram a qualidade do ar no Recife.",
      latitude: "-8.037600",
      longitude: "-34.903500",
      ...RECIFE,
      category: "planting" as const,
      pointsReward: 80,
      foneReward: "40.00",
    },
    {
      previousTitle: "Entrega de recicláveis no Marco Zero",
      title: "Entregue 20 garrafas PET no Marco Zero",
      titleEn: "Drop off 20 PET bottles at Marco Zero",
      titleEs: "Entrega 20 botellas PET en el Marco Zero",
      description: "Junte pelo menos 20 garrafas PET vazias em casa e entregue no ponto de coleta seletiva do Marco Zero.",
      descriptionEn: "Save at least 20 empty PET bottles at home and drop them off at the Marco Zero collection point.",
      descriptionEs: "Junta al menos 20 botellas PET vacías en casa y entrégalas en el punto de recolección del Marco Zero.",
      context: "No ponto de coleta, espalhe as garrafas no chão sem empilhar e fotografe todas juntas antes de entregar.",
      proofType: "count" as const,
      countItem: "pet_bottle" as const,
      countTarget: 20,
      impact: "A reciclagem gera renda para cooperativas de catadores e reduz o lixo em aterros.",
      latitude: "-8.063100",
      longitude: "-34.871100",
      ...RECIFE,
      category: "recycling" as const,
      pointsReward: 30,
      foneReward: "15.00",
    },
    {
      title: "Doação de roupas no Parque Dona Lindu",
      titleEn: "Clothing donation at Dona Lindu Park",
      titleEs: "Donación de ropa en el Parque Dona Lindu",
      description: "Doe pelo menos 3 peças de roupa em bom estado na campanha de arrecadação.",
      descriptionEn: "Donate at least 3 items of clothing in good condition to the collection campaign.",
      descriptionEs: "Dona al menos 3 prendas de ropa en buen estado en la campaña de recolección.",
      context: "No ponto de arrecadação, estenda as peças lado a lado e fotografe antes de entregar.",
      proofType: "count" as const,
      countItem: "clothing" as const,
      countTarget: 3,
      impact: "Reaproveitar roupas reduz o descarte têxtil e ajuda famílias da comunidade.",
      latitude: "-8.136600",
      longitude: "-34.900800",
      ...RECIFE,
      category: "donation" as const,
      pointsReward: 40,
      foneReward: "20.00",
    },
    // "Anywhere" missions: available in every region (no distance check), so no city is ever empty.
    {
      previousTitle: "Separe o lixo reciclável em casa",
      title: "Junte 30 latinhas de alumínio",
      titleEn: "Collect 30 aluminium cans",
      titleEs: "Junta 30 latas de aluminio",
      description: "Junte pelo menos 30 latinhas vazias e amassadas para entregar a um catador ou ponto de coleta.",
      descriptionEn: "Save at least 30 empty, crushed cans to give to a waste picker or a collection point.",
      descriptionEs: "Junta al menos 30 latas vacías y aplastadas para entregar a un reciclador o punto de recolección.",
      context: "Espalhe as latinhas no chão sem empilhar e fotografe todas de cima.",
      impact: "A latinha é 100% reciclável, volta à prateleira em cerca de 60 dias e é uma das principais rendas dos catadores.",
      aiChecklist: "latinhas de alumínio vazias espalhadas no chão, todas visíveis para contar",
      proofType: "count" as const,
      countItem: "can" as const,
      countTarget: 30,
      latitude: null,
      longitude: null,
      scope: "anywhere" as const,
      category: "recycling" as const,
      pointsReward: 20,
      foneReward: "5.00",
    },
    {
      previousTitle: "Guarde o óleo de cozinha usado",
      title: "Junte 10 pilhas usadas",
      titleEn: "Collect 10 used batteries",
      titleEs: "Junta 10 pilas usadas",
      description: "Pilha não vai no lixo comum. Junte pelo menos 10 pilhas usadas para levar a um ponto de coleta (mercados e farmácias costumam ter).",
      descriptionEn: "Batteries don't go in the regular bin. Save at least 10 used batteries to take to a collection point (supermarkets and pharmacies often have one).",
      descriptionEs: "Las pilas no van a la basura común. Junta al menos 10 pilas usadas para llevar a un punto de recolección (supermercados y farmacias suelen tener).",
      context: "Espalhe as pilhas sobre uma mesa, lado a lado, e fotografe de cima.",
      impact: "Pilhas no lixo comum liberam metais pesados que contaminam o solo e a água.",
      aiChecklist: "pilhas usadas lado a lado sobre uma mesa, todas visíveis para contar",
      proofType: "count" as const,
      countItem: "battery" as const,
      countTarget: 10,
      latitude: null,
      longitude: null,
      scope: "anywhere" as const,
      category: "recycling" as const,
      pointsReward: 15,
      foneReward: "3.00",
    },
  ];

  for (const { previousTitle, ...mission } of demoMissions) {
    const titles = previousTitle ? [mission.title, previousTitle] : [mission.title];
    const [existing] = await db.select({ id: missions.id, title: missions.title }).from(missions).where(inArray(missions.title, titles)).limit(1);
    if (existing) {
      // Version 1.10: how each mission is proven (count instead of weight, before/after photos).
      const proof = { proofType: mission.proofType, countItem: mission.countItem ?? null, countTarget: mission.countTarget ?? null };
      if (existing.title === mission.title) await db.update(missions).set(proof).where(eq(missions.id, existing.id));
      else {
        await db.update(missions).set({ ...mission, ...proof }).where(eq(missions.id, existing.id));
        console.log(`✓ missão atualizada: ${previousTitle} → ${mission.title}`);
        continue;
      }
      // Older databases: fill in the region fields added later.
      if (mission.scope === "local" && "city" in mission) {
        await db
          .update(missions)
          .set({ city: mission.city, stateCode: mission.stateCode, ibgeCode: mission.ibgeCode })
          .where(and(eq(missions.id, existing.id), isNull(missions.ibgeCode)));
      }
      console.log(`• missão já existe: ${mission.title}`);
      continue;
    }
    await db.insert(missions).values({ ...mission, createdBy: adminId });
    console.log(`✓ missão criada: ${mission.title}`);
  }

  // Example sponsor paying the FONE of the "óleo" mission from its own budget (see Admin → Missões → Patrocinadores).
  const [anySponsor] = await db.select({ id: sponsors.id }).from(sponsors).limit(1);
  if (!anySponsor) {
    const [sponsor] = await db
      .insert(sponsors)
      .values({ name: "Instituto Exemplo Verde", budgetFone: "30.00", createdBy: adminId })
      .returning({ id: sponsors.id, name: sponsors.name });
    await db
      .update(missions)
      .set({ sponsorId: sponsor.id, sponsorName: sponsor.name })
      .where(and(eq(missions.title, "Guarde o óleo de cozinha usado"), isNull(missions.sponsorId)));
    console.log(`✓ patrocinador de exemplo: ${sponsor.name} (30 FONE)`);
  }

  // Version 1.10: a collection point that weighs deliveries + a mission proven there (scale weight, not an estimate).
  const [anyPoint] = await db.select({ id: collectionPoints.id }).from(collectionPoints).limit(1);
  if (!anyPoint) {
    const { randomInt } = await import("node:crypto");
    const { newPartnerToken } = await import("../src/lib/benefits");
    const [point] = await db
      .insert(collectionPoints)
      .values({
        name: "Cooperativa Reciclar Juntos",
        address: "Rua da Aurora, 100 - Boa Vista",
        city: "Recife",
        token: newPartnerToken(() => randomInt(0, 1_000_000) / 1_000_000),
        createdBy: adminId,
      })
      .returning({ id: collectionPoints.id, token: collectionPoints.token });
    await db.insert(missions).values({
      ...RECIFE,
      title: "Entregue recicláveis na cooperativa",
      titleEn: "Drop off recyclables at the cooperative",
      titleEs: "Entrega reciclables en la cooperativa",
      description: "Leve plástico, papel, metal ou vidro limpos à Cooperativa Reciclar Juntos. A equipe pesa na balança e confirma pelo app.",
      descriptionEn: "Take clean plastic, paper, metal or glass to the Reciclar Juntos cooperative. The team weighs it on the scale and confirms in the app.",
      descriptionEs: "Lleva plástico, papel, metal o vidrio limpios a la Cooperativa Reciclar Juntos. El equipo lo pesa en la balanza y confirma en la app.",
      context: "Tire uma foto do material na entrada da cooperativa e envie. Depois mostre o QR de Meus envios no balcão.",
      impact: "Cada quilo pesado na cooperativa vira renda para os catadores e um registro rastreável da coleta.",
      proofType: "partner",
      collectionPointId: point.id,
      latitude: "-8.057800",
      longitude: "-34.880800",
      category: "recycling",
      pointsReward: 25,
      foneReward: "5.00",
      createdBy: adminId,
    });
    console.log(`✓ ponto de coleta de exemplo: /ponto/${point.token}`);
  }

  console.log(`\nPronto! Senha dos usuários de demonstração: ${password}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
