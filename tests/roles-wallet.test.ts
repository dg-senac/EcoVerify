import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { canReview, homeFor, isParticipant, isStaffExperience, navItemsFor } from "@/lib/nav";
import { parseDeclaredWallet, walletOptionalText } from "@/lib/wallet-optional";
import { rankingTab } from "@/lib/seasons";
import { ref } from "@/db/sql-ref";
import * as schema from "@/db/schema";

const hrefs = (role: "citizen" | "moderator" | "admin", enabled = true) => navItemsFor(role, enabled).map((item) => item.href);

describe("roles", () => {
  it("moderators use the citizen app plus Moderation", () => {
    const citizen = hrefs("citizen");
    const moderator = hrefs("moderator");
    for (const href of citizen) expect(moderator).toContain(href);
    expect(moderator).toContain("/moderation");
    expect(citizen).not.toContain("/moderation");
    expect(homeFor("moderator")).toBe("/missions");
    expect(isStaffExperience("moderator", true)).toBe(false);
    expect(isParticipant("moderator")).toBe(true);
  });

  it("moderators switched off keep the citizen app without Moderation", () => {
    expect(hrefs("moderator", false)).not.toContain("/moderation");
    expect(hrefs("moderator", false)).toContain("/missions");
    expect(canReview("moderator", false)).toBe(false);
  });

  it("the admin only has staff screens", () => {
    const admin = hrefs("admin");
    expect(admin).toEqual(expect.arrayContaining(["/admin", "/moderation"]));
    for (const href of ["/missions", "/ranking", "/community", "/quiz"]) expect(admin).not.toContain(href);
    expect(homeFor("admin")).toBe("/admin");
    expect(isStaffExperience("admin")).toBe(true);
    expect(canReview("admin", false)).toBe(true);
  });
});

describe("optional wallet", () => {
  const address = "f" + "a".repeat(63);

  it("empty is fine (wallet is optional)", () => {
    expect(parseDeclaredWallet("", false)).toEqual({ address: null });
    expect(parseDeclaredWallet("   ", false)).toEqual({ address: null });
  });

  it("validates the Fone format and normalizes it", () => {
    expect(parseDeclaredWallet("f123", true).error).toBe("invalid_address");
    expect(parseDeclaredWallet("0x" + "a".repeat(40), true).error).toBe("invalid_address");
    expect(parseDeclaredWallet(` ${address.toUpperCase()} `, true)).toEqual({ address });
  });

  it("only adults may give a wallet", () => {
    expect(parseDeclaredWallet(address, false).error).toBe("adult_required");
    expect(parseDeclaredWallet(address, false, true)).toEqual({ address });
  });

  it("has every text in the three languages", () => {
    for (const lang of ["pt", "en", "es"] as const) {
      const text = walletOptionalText(lang);
      for (const value of Object.values(text)) expect(value).toBeTruthy();
    }
  });
});

describe("ranking tabs", () => {
  it("parses the tab on the server (pure helper)", () => {
    expect(rankingTab("schools")).toBe("schools");
    expect(rankingTab("nope")).toBe("season");
    expect(rankingTab(null)).toBe("season");
  });
});

describe("correlated subqueries", () => {
  it("ref() always qualifies the column, even in single-table selects", () => {
    const db = drizzle({ connection: "postgres://x@127.0.0.1:1/x", schema });
    const query = db
      .select({ id: schema.missions.id, n: sql`(select count(*) from submissions s where s.mission_id = ${ref(schema.missions.id)})` })
      .from(schema.missions)
      .toSQL().sql;
    expect(query).toContain('s.mission_id = "missions"."id"');
  });
});

describe("supabase SQL files", () => {
  const schemaSql = readFileSync("supabase/01_schema.sql", "utf8");

  it("01_schema.sql creates every table of src/db/schema.ts (run npm run supabase:schema)", () => {
    const tables = Object.values(schema)
      .filter((value) => is(value, PgTable))
      .map((table) => getTableName(table as PgTable));
    expect(tables.length).toBeGreaterThan(20);
    for (const table of tables) expect(schemaSql).toContain(`CREATE TABLE "${table}"`);
    expect(schemaSql).toContain('"declared_wallet_address" text');
  });

  it("security, storage and admin scripts are present", () => {
    expect(readFileSync("supabase/02_seguranca.sql", "utf8")).toContain("enable row level security");
    expect(readFileSync("supabase/03_storage.sql", "utf8")).toMatch(/'uploads', 'uploads', false/);
    expect(readFileSync("supabase/05_admin.sql", "utf8")).toContain("set role = 'admin'");
  });
});
