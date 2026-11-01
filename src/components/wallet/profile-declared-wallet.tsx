"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { saveDeclaredWalletAction } from "@/lib/actions/wallet";
import { DeclaredWalletCard } from "@/components/wallet/declared-wallet";

/** Web wrapper: the card calls the server action and refreshes the profile. */
export function ProfileDeclaredWallet({ lang, address, adultDeclared }: { lang: Lang; address: string | null; adultDeclared: boolean }) {
  const router = useRouter();
  return (
    <DeclaredWalletCard
      lang={lang}
      address={address}
      adultDeclared={adultDeclared}
      onSave={async (next, adult) => {
        const result = await saveDeclaredWalletAction(next, adult);
        if (!result.error) router.refresh();
        return result;
      }}
    />
  );
}
