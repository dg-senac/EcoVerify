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
import { eq } from "drizzle-orm";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error("Refusing to seed in production (set SEED_ALLOW_PRODUCTION=true to override).");
  }

  const { db, pool } = await import("../src/db");
  const { missions, users } = await import("../src/db/schema");

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

  const demoMissions = [
    {
      title: "Mutirão de limpeza na Praia de Boa Viagem",
      titleEn: "Beach cleanup at Boa Viagem",
      titleEs: "Limpieza de la playa de Boa Viagem",
      description: "Recolha pelo menos um saco de resíduos na faixa de areia e descarte corretamente.",
      descriptionEn: "Collect at least one bag of waste from the sand and dispose of it properly.",
      descriptionEs: "Recoge al menos una bolsa de residuos en la arena y deséchala correctamente.",
      context: "Leve luvas e sacos. Fotografe o material recolhido com a praia ao fundo.",
      impact: "Resíduos plásticos na praia acabam no mar e afetam tartarugas e peixes.",
      latitude: "-8.119600",
      longitude: "-34.895600",
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
      impact: "Árvores reduzem ilhas de calor e melhoram a qualidade do ar no Recife.",
      latitude: "-8.037600",
      longitude: "-34.903500",
      category: "planting" as const,
      pointsReward: 80,
      foneReward: "40.00",
    },
    {
      title: "Entrega de recicláveis no Marco Zero",
      titleEn: "Drop off recyclables at Marco Zero",
      titleEs: "Entrega de reciclables en el Marco Zero",
      description: "Separe recicláveis em casa e entregue no ponto de coleta seletiva.",
      descriptionEn: "Sort recyclables at home and drop them off at the collection point.",
      descriptionEs: "Separa reciclables en casa y entrégalos en el punto de recolección.",
      context: "Fotografe o material separado no ponto de coleta.",
      impact: "A reciclagem gera renda para cooperativas de catadores e reduz o lixo em aterros.",
      latitude: "-8.063100",
      longitude: "-34.871100",
      category: "recycling" as const,
      pointsReward: 30,
      foneReward: "15.00",
    },
    {
      title: "Doação de roupas no Parque Dona Lindu",
      titleEn: "Clothing donation at Dona Lindu Park",
      titleEs: "Donación de ropa en el Parque Dona Lindu",
      description: "Doe roupas em bom estado na campanha de arrecadação.",
      descriptionEn: "Donate clothes in good condition to the collection campaign.",
      descriptionEs: "Dona ropa en buen estado en la campaña de recolección.",
      context: "Fotografe a entrega no ponto de arrecadação.",
      impact: "Reaproveitar roupas reduz o descarte têxtil e ajuda famílias da comunidade.",
      latitude: "-8.136600",
      longitude: "-34.900800",
      category: "donation" as const,
      pointsReward: 40,
      foneReward: "20.00",
    },
  ];

  for (const mission of demoMissions) {
    const [existing] = await db.select({ id: missions.id }).from(missions).where(eq(missions.title, mission.title)).limit(1);
    if (existing) {
      console.log(`• missão já existe: ${mission.title}`);
      continue;
    }
    await db.insert(missions).values({ ...mission, createdBy: adminId });
    console.log(`✓ missão criada: ${mission.title}`);
  }

  console.log(`\nPronto! Senha dos usuários de demonstração: ${password}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
