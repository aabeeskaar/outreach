import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSentEmails, getGmailConnection } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has Gmail connected
    const connection = await getGmailConnection(session.user.id);
    if (!connection) {
      return NextResponse.json(
        { error: "Gmail not connected", code: "GMAIL_NOT_CONNECTED" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get("limit") || "20");
    const pageToken = searchParams.get("pageToken") || undefined;

    const { messages, nextPageToken } = await getSentEmails(
      session.user.id,
      maxResults,
      pageToken
    );

    return NextResponse.json({
      emails: messages,
      nextPageToken,
    });
  } catch (error) {
    console.error("Get sent emails error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sent emails" },
      { status: 500 }
    );
  }
}
