import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { disconnectGmail } from "@/lib/gmail";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await disconnectGmail(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gmail disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
