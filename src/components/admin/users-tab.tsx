import { UserRow } from "@/components/admin/user-row";

export function UsersTab({
  users,
  currentUserId,
}: {
  users: {
    id: string;
    name: string;
    email: string;
    role: "citizen" | "moderator" | "admin";
    totalPoints: number;
    createdAt: Date;
    isBanned: boolean;
    banReason: string | null;
    bannedAt: Date | null;
    banAppealMessage: string | null;
    banAppealedAt: Date | null;
  }[];
  currentUserId: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-bold text-slate-900">Usuários da plataforma</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <UserRow key={user.id} user={user} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}
