import { Check, ShieldCheck, Sprout, BarChart3 } from "lucide-react";
import { t } from "@/lib/i18n";
import { navigate } from "../router";
import { dt } from "../i18n";
import { loginAs, useLang, useStore, type User } from "../store";
import { Avatar, Modal, toast } from "./ui";

export const roleTone: Record<User["role"], string> = {
  citizen: "from-emerald-500 to-teal-600",
  moderator: "from-sky-500 to-indigo-600",
  admin: "from-amber-500 to-orange-600",
};

const roleIcon = { citizen: Sprout, moderator: ShieldCheck, admin: BarChart3 };

/** Profiles a tester can switch to: the ready-made ones plus accounts created on this device. */
export function useSwitchableUsers() {
  return useStore((s) => s.users.filter((u) => !u.isBot));
}

export function ProfileList({ onPicked }: { onPicked?: () => void }) {
  const lang = useLang();
  const users = useSwitchableUsers();
  const currentId = useStore((s) => s.currentUserId);

  const pick = (user: User) => {
    const result = loginAs(user.id);
    if (result.error) {
      toast(t(lang, result.error === "banned" ? "banned_error" : "error_generic"), "error");
      return;
    }
    onPicked?.();
    navigate(user.role === "citizen" ? "/missions" : user.role === "moderator" ? "/moderation" : "/admin", { replace: true });
  };

  return (
    <div className="grid gap-2.5">
      {users.map((user) => {
        const Icon = roleIcon[user.role];
        const roleKey = user.role === "admin" ? "demo_role_admin" : user.role === "moderator" ? "demo_role_moderator" : "demo_role_citizen";
        return (
          <button
            key={user.id}
            type="button"
            onClick={() => pick(user)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
              user.id === currentId ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
            } ${user.isBanned ? "opacity-60" : ""}`}
          >
            <Avatar name={user.name} size={44} tone={roleTone[user.role]} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                {user.name}
                {user.isBanned && <span className="rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700">{dt(lang, "banned_label")}</span>}
              </p>
              <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Icon className="h-3.5 w-3.5" /> {dt(lang, roleKey)}
              </p>
              {user.isDemoProfile && <p className="mt-0.5 text-xs text-slate-400">{dt(lang, `${roleKey}_desc`)}</p>}
            </div>
            {user.id === currentId && <Check className="h-5 w-5 text-emerald-600" />}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileSwitcher({ onClose }: { onClose: () => void }) {
  const lang = useLang();
  return (
    <Modal title={dt(lang, "demo_switch_profile")} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">{dt(lang, "demo_switch_hint")}</p>
      <ProfileList onPicked={onClose} />
    </Modal>
  );
}
