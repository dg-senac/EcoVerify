export type AdminSecurity = {
  ownerIds: string[];
  adminEmailsCount: number;
  ownersRegistered: number;
  reservedAdmin: boolean;
  unlistedAdmins: string[];
  seedAccountsAllowed: boolean;
  seedAccountsPresent: boolean;
  production: boolean;
};

type Item = { ok: boolean; text: string };

/** Admin → Users: is the administration locked down? (ADMIN_EMAILS, seed accounts, moderators). */
export function SecurityPanel({ security, moderatorsEnabled }: { security: AdminSecurity; moderatorsEnabled: boolean }) {
  const items: Item[] = [
    security.adminEmailsCount > 0
      ? {
          ok: security.ownersRegistered > 0,
          text:
            security.ownersRegistered > 0
              ? `ADMIN_EMAILS definido (${security.adminEmailsCount} e-mail${security.adminEmailsCount > 1 ? "s" : ""}). Só essas contas podem ser administradoras.`
              : "ADMIN_EMAILS definido, mas a conta ainda não foi criada. Crie a conta com esse e-mail e confirme o e-mail para virar admin.",
        }
      : { ok: !security.production, text: "ADMIN_EMAILS não definido: qualquer admin pode promover outras contas a admin. Defina o e-mail do dono no servidor." },
    security.unlistedAdmins.length
      ? { ok: false, text: `Admins fora do ADMIN_EMAILS: ${security.unlistedAdmins.join(", ")}. Rebaixe essas contas.` }
      : null,
    security.seedAccountsAllowed
      ? {
          ok: !security.production,
          text: security.production
            ? "ALLOW_SEED_ACCOUNTS ligado em produção: as contas de exemplo (senha pública) conseguem entrar. Desligue."
            : "Contas de exemplo (@ecoverify.dev) liberadas porque este não é o ambiente de produção.",
        }
      : {
          ok: true,
          text: security.seedAccountsPresent
            ? "Contas de exemplo existem no banco, mas estão bloqueadas (não entram em produção)."
            : "Contas de exemplo desligadas.",
        },
    {
      ok: true,
      text: moderatorsEnabled ? "Moderadores liberados (MODERATORS_ENABLED): revisam e dão cartão amarelo." : "Moderação só com administradores.",
    },
  ].filter((item): item is Item => !!item);
  const allOk = items.every((item) => item.ok);
  return (
    <div className={`mb-5 rounded-2xl border p-4 ${allOk ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`} data-testid="admin-security">
      <h3 className="font-bold text-slate-900">🔐 Segurança da administração</h3>
      <ul className="mt-2 space-y-1 text-xs text-slate-700">
        {items.map((item) => (
          <li key={item.text} className="flex gap-2">
            <span>{item.ok ? "✅" : "⚠️"}</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
