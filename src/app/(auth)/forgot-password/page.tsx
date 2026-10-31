import { ForgotPasswordForm } from "@/components/auth/account-forms";
import { getCurrentUser } from "@/lib/auth";
import { guestLang } from "@/lib/guest-lang";

export default async function ForgotPasswordPage() {
  const lang = await guestLang(null, await getCurrentUser());
  return <ForgotPasswordForm lang={lang} />;
}
