import { redirect } from "next/navigation";
import { AcceptTermsForm } from "@/components/auth/account-forms";
import { getCurrentUser } from "@/lib/auth";
import { TERMS_VERSION } from "@/lib/legal";

export default async function AcceptTermsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.termsVersion === TERMS_VERSION) redirect("/missions");
  return <AcceptTermsForm lang={user.language} />;
}
