import { NextResponse, type NextRequest } from "next/server";
import { isParticipant } from "@/lib/nav";
import { getCurrentUser } from "@/lib/auth";
import { fetchCommunityMessages, isCommunityMember } from "@/lib/community";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Same rule as the community page: the chat is for citizens.
    if (!isParticipant(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Each organization has its own chat: only its members can read it.
    const organizationId = request.nextUrl.searchParams.get("org") ?? "";
    if (!(await isCommunityMember(user.id, organizationId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(await fetchCommunityMessages(user.id, organizationId));
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
