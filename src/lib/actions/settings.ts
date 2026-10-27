"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { headers } from "next/headers";
import type { ActionState } from "@/lib/actions/auth";
import { parseTheme } from "@/lib/theme";

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const languageInput = String(formData.get("language") ?? "pt");
  const fontSizeInput = String(formData.get("fontSize") ?? "medium");
  const language = (["pt", "en", "es"] as const).find((value) => value === languageInput) ?? "pt";
  const fontSize = (["small", "medium", "large"] as const).find((value) => value === fontSizeInput) ?? "medium";
  const theme = parseTheme(formData.get("theme"));
  const highContrast = formData.get("highContrast") === "on";
  const reducedMotion = formData.get("reducedMotion") === "on";
  const notificationsEnabled = formData.get("notificationsEnabled") === "on";

  await db
    .update(users)
    .set({ language, fontSize, theme, highContrast, reducedMotion, notificationsEnabled })
    .where(eq(users.id, user.id));

  revalidatePath("/", "layout");

  // Get the current path to redirect back to the same page
  const headersList = await headers();
  const referer = headersList.get("referer") || "/settings";
  // Only the path is kept, so this can never redirect to another site.
  const url = new URL(referer, "http://localhost");
  redirect(url.pathname.startsWith("/") ? url.pathname : "/settings");
}
