import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchCommunityMessages } from "@/lib/community";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Same rule as the community page: the chat is for citizens.
    if (user.role !== "citizen") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(await fetchCommunityMessages(user.id));
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
