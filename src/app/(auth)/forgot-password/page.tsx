import { ForgotPasswordForm } from "@/components/auth/account-forms";
import { getCurrentUser } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const lang = (await getCurrentUser())?.language ?? "pt";
  return <ForgotPasswordForm lang={lang} />;
}
