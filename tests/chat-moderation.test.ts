import { describe, expect, it } from "vitest";
import { canSendChatMedia, chatModText, chatTextIssue, isChatMuted, isChatMuteHours, isChatReportReason, shouldHideForReports } from "@/lib/chat-moderation";

describe("chatTextIssue", () => {
  it.each([
    "Me chama no (81) 99999-1234",
    "81999991234",
    "+55 81 9 9999 1234",
    "meu email é joao@gmail.com",
  ])("blocks contact data: %s", (text) => {
    expect(chatTextIssue(text)).toBe("contact_info");
  });

  it.each(["olha www.site.com", "https://example.org/x", "entra em ecoverify.com.br", "wa.me/5581999", "t.me/grupo"])("blocks links: %s", (text) => {
    expect(chatTextIssue(text)).toBe("link");
  });

  it.each([
    "Bom dia! Coletei 25 garrafas hoje",
    "Mutirão dia 15/11 às 8h na praia",
    "Juntamos 1.500 kg em 2025",
    "Feito.Me avisa depois",
    "Bom dia.Com certeza vou",
    "nota 10, 20 30 40",
    "",
  ])("allows normal messages: %s", (text) => {
    expect(chatTextIssue(text)).toBeNull();
  });
});

describe("reports", () => {
  it("3 reports hide a message; 2 are enough for sexual content or violence", () => {
    expect(shouldHideForReports(["spam", "offense"])).toBe(false);
    expect(shouldHideForReports(["spam", "offense", "other"])).toBe(true);
    expect(shouldHideForReports(["sexual", "spam"])).toBe(true);
    expect(shouldHideForReports(["violence", "violence"])).toBe(true);
    expect(shouldHideForReports(["sexual"])).toBe(false);
  });

  it("validates reasons and mute options", () => {
    expect(isChatReportReason("spam")).toBe(true);
    expect(isChatReportReason("bored")).toBe(false);
    expect(isChatMuteHours(24)).toBe(true);
    expect(isChatMuteHours(5)).toBe(false);
  });
});

describe("media and mute", () => {
  it("audio and video only for people who declared being 18+", () => {
    expect(canSendChatMedia("audio", false)).toBe(false);
    expect(canSendChatMedia("video", false)).toBe(false);
    expect(canSendChatMedia("image", false)).toBe(true);
    expect(canSendChatMedia("gif", false)).toBe(true);
    expect(canSendChatMedia("video", true)).toBe(true);
  });

  it("mute ends on its date", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    expect(isChatMuted("2026-11-02T00:00:00Z", now)).toBe(true);
    expect(isChatMuted("2026-10-31T00:00:00Z", now)).toBe(false);
    expect(isChatMuted(null, now)).toBe(false);
  });

  it("every report reason has a label in the three languages", () => {
    for (const lang of ["pt", "en", "es"] as const) {
      const text = chatModText(lang);
      for (const label of Object.values(text.reasons)) expect(label.length).toBeGreaterThan(2);
    }
  });
});
