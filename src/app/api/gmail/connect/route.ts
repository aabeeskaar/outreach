import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { getAuthUrl } from "@/lib/gmail";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUrl = getAuthUrl();
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Gmail connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
