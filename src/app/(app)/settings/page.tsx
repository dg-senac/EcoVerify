import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { isEmailVerificationRequired } from "@/lib/email";
import { LogoHorizontal } from "@/components/logo";
import { SettingsForm } from "@/components/settings/settings-form";
import { AccountSettings } from "@/components/account/account-settings";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <LogoHorizontal height={34} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "settings_title")}</h1>
      <div className="mt-6 max-w-xl space-y-6">
        <SettingsForm
          language={user.language}
          fontSize={user.fontSize}
          theme={user.theme}
          highContrast={user.highContrast}
          reducedMotion={user.reducedMotion}
          notificationsEnabled={user.notificationsEnabled}
        />
        <AccountSettings
          lang={user.language}
          email={user.email}
          emailVerified={!!user.emailVerifiedAt}
          verificationRequired={isEmailVerificationRequired()}
          termsAcceptedOn={user.termsAcceptedAt ? formatDate(user.termsAcceptedAt, user.language) : null}
        />
      </div>
    </div>
  );
}
