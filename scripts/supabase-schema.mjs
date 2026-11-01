/**
 * Regenerates supabase/01_schema.sql from src/db/schema.ts (the single source of truth).
 *
 *   npm run supabase:schema
 *
 * Uses drizzle-kit to produce the CREATE statements for an empty database, then wraps them in a
 * transaction so a failed run in the Supabase SQL editor leaves nothing half-created.
 * Run it after changing src/db/schema.ts and commit the result (tests/supabase-sql.test.ts checks
 * that the file covers every table).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "ecoverify-sql-"));
const config = join(root, `drizzle.supabase.${process.pid}.config.mjs`);

writeFileSync(
  config,
  `export default { dialect: "postgresql", schema: "./src/db/schema.ts", out: ${JSON.stringify(out)} };\n`,
);
try {
  execFileSync("npx", ["drizzle-kit", "generate", `--config=${config}`, "--name=schema"], { cwd: root, stdio: "inherit" });
} finally {
  rmSync(config, { force: true });
}

const file = readdirSync(out).find((name) => name.endsWith(".sql"));
if (!file) throw new Error("drizzle-kit did not generate SQL");
const statements = readFileSync(join(out, file), "utf8")
  .split("--> statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);
rmSync(out, { recursive: true, force: true });

const header = `-- =====================================================================
-- EcoVerify · 1/5 · Tabelas do app (Supabase / PostgreSQL)
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo inteiro → Run.
-- Rode UMA vez, num projeto novo. Tudo roda numa transação: se algo falhar,
-- nada fica pela metade. Se aparecer "already exists", as tabelas já foram criadas.
--
-- Gerado automaticamente de src/db/schema.ts (npm run supabase:schema).
-- Não edite à mão: mude o schema.ts e gere de novo.
-- =====================================================================

begin;

`;

writeFileSync(join(root, "supabase", "01_schema.sql"), `${header}${statements.map((s) => (s.endsWith(";") ? s : `${s};`)).join("\n")}\n\ncommit;\n`);
console.log(`✓ supabase/01_schema.sql (${statements.length} comandos)`);
