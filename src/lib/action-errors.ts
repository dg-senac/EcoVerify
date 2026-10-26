import { t, type DictKey, type Lang } from "@/lib/i18n";

/** Maps error codes returned by auth/account server actions to translated messages. */
const ERROR_KEYS: Record<string, DictKey> = {
  too_many_attempts: "error_too_many_attempts",
  weak_password: "register_password_hint",
  email_exists: "register_email_exists",
  terms_required: "error_terms_required",
  age_required: "error_age_required",
  email_unavailable: "error_email_unavailable",
  email_failed: "error_email_failed",
  password_mismatch: "error_password_mismatch",
  wrong_password: "error_wrong_password",
  last_admin: "error_last_admin",
  confirm_required: "error_confirm_required",
  invalid_token: "reset_invalid",
  banned: "banned_error",
};

export function actionErrorMessage(lang: Lang, error: string | undefined, fallback: DictKey = "login_error"): string | null {
  if (!error) return null;
  return t(lang, ERROR_KEYS[error] ?? fallback);
}
