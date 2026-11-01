import { describe, expect, it } from "vitest";
import {
  CUP_MIN_ACTIVE,
  CUP_TOP_N,
  daysLeft,
  previousSeason,
  primarySchools,
  rankByPoints,
  schoolCup,
  seasonAt,
  seasonById,
  seasonMonths,
  seasonProgress,
  seasonRanking,
  type CupMembership,
  type PointEntry,
} from "@/lib/seasons";

describe("seasons (two-month periods, Recife time)", () => {
  it("splits the year into six seasons", () => {
    expect(seasonAt("2026-01-15T12:00:00-03:00").id).toBe("2026-1");
    expect(seasonAt("2026-02-28T23:59:00-03:00").id).toBe("2026-1");
    expect(seasonAt("2026-03-01T00:00:00-03:00").id).toBe("2026-2");
    expect(seasonAt("2026-11-01T09:00:00-03:00").id).toBe("2026-6");
    expect(seasonAt("2026-12-31T23:59:59-03:00").id).toBe("2026-6");
  });

  it("uses Recife midnight, not UTC midnight", () => {
    // 01:00 UTC on 1 Nov is still 31 Oct (22:00) in Recife.
    expect(seasonAt("2026-11-01T01:00:00Z").id).toBe("2026-5");
    expect(seasonAt("2026-11-01T03:00:00Z").id).toBe("2026-6");
    const season = seasonAt("2026-11-10T12:00:00Z");
    expect(season.start.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(season.end.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("goes back across the new year and parses ids", () => {
    expect(previousSeason(seasonById("2027-1")!).id).toBe("2026-6");
    expect(previousSeason(seasonById("2026-6")!).id).toBe("2026-5");
    expect(seasonById("2026-7")).toBeNull();
    expect(seasonById("abc")).toBeNull();
  });

  it("counts days left and progress", () => {
    const season = seasonById("2026-6")!;
    expect(daysLeft(season, "2026-12-31T12:00:00-03:00")).toBe(1);
    expect(daysLeft(season, "2026-11-01T00:00:00-03:00")).toBe(61);
    expect(daysLeft(season, "2027-01-02T00:00:00-03:00")).toBe(0);
    expect(seasonProgress(season, "2026-10-01T00:00:00-03:00")).toBe(0);
    expect(seasonProgress(season, "2027-02-01T00:00:00-03:00")).toBe(1);
  });

  it("labels the months in each language", () => {
    const season = seasonById("2026-6")!;
    expect(seasonMonths(season, "pt")).toBe("nov–dez 2026");
    expect(seasonMonths(season, "en")).toBe("Nov–Dec 2026");
    expect(seasonMonths(season, "es")).toBe("nov–dic 2026");
  });
});

const IN_SEASON = "2026-11-10T12:00:00-03:00";
const LAST_SEASON = "2026-10-10T12:00:00-03:00";
const season = seasonById("2026-6")!;
const entry = (userId: string, points: number, at = IN_SEASON, cup = true): PointEntry => ({ userId, points, at, cup });

describe("season ranking", () => {
  it("only counts points inside the season", () => {
    const people = [
      { id: "a", name: "Ana" },
      { id: "b", name: "Bia" },
      { id: "c", name: "Caio" },
    ];
    const ranked = seasonRanking(people, [entry("a", 10), entry("b", 500, LAST_SEASON), entry("b", 5), entry("c", 0)], season);
    expect(ranked.map((r) => [r.item.id, r.points])).toEqual([
      ["a", 10],
      ["b", 5],
    ]);
  });

  it("removed points (audit) disappear with the ledger row", () => {
    const people = [{ id: "a", name: "Ana" }];
    expect(seasonRanking(people, [entry("a", 30), entry("a", -30)], season)).toEqual([]);
  });

  it("ties share the position", () => {
    const rows = [
      { id: "x", name: "Xavier", p: 50 },
      { id: "y", name: "Yara", p: 30 },
      { id: "w", name: "Wagner", p: 30 },
      { id: "z", name: "Zeca", p: 10 },
    ];
    const ranked = rankByPoints(rows, (r) => r.p, (r) => r.name, (r) => r.id);
    expect(ranked.map((r) => [r.item.id, r.position])).toEqual([
      ["x", 1],
      ["w", 2],
      ["y", 2],
      ["z", 4],
    ]);
  });
});

describe("Schools Cup", () => {
  const schools = [
    { id: "s1", name: "Escola Um" },
    { id: "s2", name: "Escola Dois" },
  ];
  const joined = "2026-09-01T00:00:00-03:00";
  const member = (orgId: string, userId: string, joinedAt = joined): CupMembership => ({ orgId, userId, joinedAt });

  it("needs MIN_ACTIVE members with points to be ranked", () => {
    const memberships = [member("s1", "a"), member("s1", "b"), member("s1", "c"), member("s2", "d"), member("s2", "e")];
    const entries = [entry("a", 10), entry("b", 10), entry("c", 10), entry("d", 100), entry("e", 100)];
    const cup = schoolCup({ schools, memberships, entries, season });
    expect(CUP_MIN_ACTIVE).toBe(3);
    expect(cup.map((r) => [r.school.id, r.points, r.position])).toEqual([
      ["s1", 30, 1],
      ["s2", 200, null],
    ]);
  });

  it("only the TOP_N best members count", () => {
    const ids = Array.from({ length: CUP_TOP_N + 5 }, (_, i) => `u${i}`);
    const memberships = ids.map((id) => member("s1", id));
    const entries = ids.map((id, i) => entry(id, i + 1));
    const [row] = schoolCup({ schools, memberships, entries, season });
    // Best 20 of 1..25 = 6..25.
    expect(row.counted).toBe(CUP_TOP_N);
    expect(row.active).toBe(CUP_TOP_N + 5);
    expect(row.points).toBe(((6 + 25) * 20) / 2);
  });

  it("ignores organization-mission points and points from before joining", () => {
    const memberships = [member("s1", "a"), member("s1", "b"), member("s1", "c", "2026-11-20T00:00:00-03:00")];
    const entries = [
      entry("a", 10),
      entry("a", 200, IN_SEASON, false), // the school's own mission
      entry("b", 10),
      entry("c", 50, IN_SEASON), // before joining
      entry("c", 5, "2026-11-25T00:00:00-03:00"),
    ];
    const [row] = schoolCup({ schools, memberships, entries, season });
    expect(row.points).toBe(25);
    expect(row.active).toBe(3);
  });

  it("each person counts for the first school they joined", () => {
    const memberships = [member("s2", "a", "2026-10-01T00:00:00-03:00"), member("s1", "a", "2026-09-01T00:00:00-03:00")];
    expect(primarySchools(memberships, new Set(["s1", "s2"])).get("a")?.orgId).toBe("s1");
    const cup = schoolCup({ schools, memberships, entries: [entry("a", 10)], season, minActive: 1 });
    expect(cup.map((r) => r.school.id)).toEqual(["s1"]);
  });

  it("leaves out schools with no points and non-school organizations", () => {
    const memberships = [member("s1", "a"), member("company", "b")];
    const cup = schoolCup({ schools, memberships, entries: [entry("a", 10), entry("b", 99)], season, minActive: 1 });
    expect(cup.map((r) => r.school.id)).toEqual(["s1"]);
  });
});
