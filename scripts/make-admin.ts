/**
 * Makes an existing account admin, for when e-mail confirmation is not set up yet.
 *
 *   npm run admin:promote -- voce@exemplo.com
 *
 * Needs DATABASE_URL (only whoever controls the database can run it). The person creates the account
 * normally in the app, with their own password; no password goes through this script.
 * With ADMIN_EMAILS set, only e-mails on that list are accepted.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Uso: npm run admin:promote -- email@exemplo.com");

  const { canHoldAdminRole, isSeedEmail } = await import("../src/lib/staff-config");
  if (!canHoldAdminRole(email)) throw new Error("Esse e-mail não está em ADMIN_EMAILS.");
  if (isSeedEmail(email) && process.env.NODE_ENV === "production") throw new Error("Contas de exemplo não podem ser admin em produção.");

  const { db, pool } = await import("../src/db");
  const { users } = await import("../src/db/schema");
  try {
    const [user] = await db.select({ id: users.id, role: users.role, deletedAt: users.deletedAt }).from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.deletedAt) throw new Error("Conta não encontrada. Crie a conta no app primeiro.");
    if (user.role === "admin") {
      console.log(`• ${email} já é admin.`);
      return;
    }
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    console.log(`✓ ${email} agora é admin.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
