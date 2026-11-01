/**
 * Optional FONE wallet address, given at sign-up or later in the profile (docs/SUPABASE.md).
 * Pure: shared by the web app, the APK and the tests.
 *
 * The address the person types is only stored as "declared": it is NOT a verified wallet and never
 * receives anything by itself. Before any payout, the existing ownership check (src/lib/actions/
 * wallet.ts: a small transfer from that wallet) confirms it belongs to the person. Only adults (18+)
 * may give a wallet, like the rest of the FONE rules.
 */
import type { Lang } from "@/lib/i18n";
import { isValidFoneAddress, normalizeHex } from "@/lib/fone";

export type DeclaredWalletError = "invalid_address" | "adult_required";

/**
 * Checks the optional wallet fields. Empty address = no wallet (fine).
 * `alreadyAdult` = the person declared 18+ before (no need to tick again).
 */
export function parseDeclaredWallet(
  rawAddress: unknown,
  adultTicked: boolean,
  alreadyAdult = false,
): { address: string | null; error?: DeclaredWalletError } {
  const address = normalizeHex(rawAddress);
  if (!address) return { address: null };
  if (!isValidFoneAddress(address)) return { address: null, error: "invalid_address" };
  if (!adultTicked && !alreadyAdult) return { address: null, error: "adult_required" };
  return { address };
}

export interface WalletOptionalText {
  label: string;
  placeholder: string;
  hint: string;
  adult: string;
  profileTitle: string;
  profileNone: string;
  profileSaved: string;
  profileNote: string;
  add: string;
  save: string;
  removed: string;
  change: string;
  remove: string;
  cancel: string;
  saved: string;
  errors: Record<DeclaredWalletError, string>;
}

const TEXT: Record<Lang, WalletOptionalText> = {
  pt: {
    label: "Endereço da carteira Fone (opcional)",
    placeholder: "f… (64 caracteres)",
    hint: "Você pode deixar em branco e adicionar depois no Perfil. Só maiores de 18 anos recebem FONE.",
    adult: "Tenho 18 anos ou mais (necessário para informar uma carteira)",
    profileTitle: "Carteira Fone",
    profileNone: "Nenhuma carteira informada. É opcional: você participa normalmente com pontos.",
    profileSaved: "Carteira informada",
    profileNote: "Antes de qualquer envio de FONE, vamos pedir uma confirmação de que a carteira é sua.",
    add: "Adicionar carteira",
    save: "Salvar carteira",
    removed: "Carteira removida.",
    change: "Trocar",
    remove: "Remover",
    cancel: "Cancelar",
    saved: "Carteira salva.",
    errors: {
      invalid_address: "Endereço inválido. A carteira Fone tem 64 caracteres e começa com \"f\" (copie no app Fone Wallet).",
      adult_required: "Para informar uma carteira, confirme que você tem 18 anos ou mais.",
    },
  },
  en: {
    label: "Fone wallet address (optional)",
    placeholder: "f… (64 characters)",
    hint: "You can leave it blank and add it later in your Profile. Only people aged 18+ receive FONE.",
    adult: "I am 18 or older (needed to add a wallet)",
    profileTitle: "Fone wallet",
    profileNone: "No wallet added. It's optional: you take part normally with points.",
    profileSaved: "Wallet added",
    profileNote: "Before any FONE is sent, we'll ask you to confirm the wallet is yours.",
    add: "Add wallet",
    save: "Save wallet",
    removed: "Wallet removed.",
    change: "Change",
    remove: "Remove",
    cancel: "Cancel",
    saved: "Wallet saved.",
    errors: {
      invalid_address: "Invalid address. A Fone wallet has 64 characters and starts with \"f\" (copy it from the Fone Wallet app).",
      adult_required: "To add a wallet, confirm that you are 18 or older.",
    },
  },
  es: {
    label: "Dirección de la billetera Fone (opcional)",
    placeholder: "f… (64 caracteres)",
    hint: "Puedes dejarlo en blanco y agregarla después en tu Perfil. Solo los mayores de 18 años reciben FONE.",
    adult: "Tengo 18 años o más (necesario para agregar una billetera)",
    profileTitle: "Billetera Fone",
    profileNone: "No agregaste ninguna billetera. Es opcional: participas normalmente con puntos.",
    profileSaved: "Billetera agregada",
    profileNote: "Antes de cualquier envío de FONE, te pediremos que confirmes que la billetera es tuya.",
    add: "Agregar billetera",
    save: "Guardar billetera",
    removed: "Billetera eliminada.",
    change: "Cambiar",
    remove: "Quitar",
    cancel: "Cancelar",
    saved: "Billetera guardada.",
    errors: {
      invalid_address: "Dirección no válida. La billetera Fone tiene 64 caracteres y empieza con \"f\" (cópiala en la app Fone Wallet).",
      adult_required: "Para agregar una billetera, confirma que tienes 18 años o más.",
    },
  },
};

export function walletOptionalText(lang: Lang): WalletOptionalText {
  return TEXT[lang] ?? TEXT.pt;
}
