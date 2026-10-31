import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { safeNextPath } from "@/lib/utils";
import { guestLang } from "@/lib/guest-lang";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const user = await getCurrentUser();
  if (user) redirect(next ?? "/missions");

  return <RegisterForm lang={await guestLang()} next={next} />;
}
