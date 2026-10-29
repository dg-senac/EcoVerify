import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** The app has no landing page (the public site lives in its own repository): signed in → missions, signed out → login. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/missions" : "/login");
}
