"use client";

import { useRouter } from "next/navigation";
import { appealCardAction } from "@/lib/actions/cards";
import { t, type Lang } from "@/lib/i18n";
import { CardsPanel, type CardView } from "@/components/cards/cards-panel";

/** Server-mode wrapper: appeals go through the server action. */
export function MyCards({ lang, cards }: { lang: Lang; cards: CardView[] }) {
  const router = useRouter();
  return (
    <CardsPanel
      lang={lang}
      cards={cards}
      errorText={(code) => {
        const text = t(lang, code as Parameters<typeof t>[1]);
        return text === code ? t(lang, "error_generic") : text;
      }}
      onAppeal={async (cardId, message) => {
        const formData = new FormData();
        formData.set("cardId", cardId);
        formData.set("message", message);
        const result = await appealCardAction({}, formData);
        if (result.success) router.refresh();
        return result;
      }}
    />
  );
}
