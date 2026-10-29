"use client";

import { giveCardAction, keepCardAction, liftSuspensionAction, revokeCardAction } from "@/lib/actions/cards";
import { UserSheetView, type SheetUser, type UserDetails } from "@/components/admin/user-sheet-view";

export { CardBadges, type AdminCard, type SheetUser, type UserDetails } from "@/components/admin/user-sheet-view";

/** Web-app wrapper of the user sheet: every action goes through a server action. */
export function UserSheet({ user, details, onClose }: { user: SheetUser; details: UserDetails; onClose: () => void }) {
  return (
    <UserSheetView
      user={user}
      details={details}
      onClose={onClose}
      handlers={{
        onGive: ({ type, reason, note }) => {
          const formData = new FormData();
          formData.set("userId", user.id);
          formData.set("type", type);
          formData.set("reason", reason);
          formData.set("note", note);
          return giveCardAction({}, formData);
        },
        onRevoke: (cardId) => revokeCardAction(cardId),
        onKeep: (cardId) => keepCardAction(cardId),
        onLift: () => liftSuspensionAction(user.id),
      }}
    />
  );
}
