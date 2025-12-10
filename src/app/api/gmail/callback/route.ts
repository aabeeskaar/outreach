import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { getTokensFromCode, saveGmailConnection, getOAuth2Client } from "@/lib/gmail";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Gmail OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=gmail_auth_failed", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=no_code", request.url)
      );
    }

    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_tokens", request.url)
      );
    }

    // Get user's email
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      return NextResponse.redirect(
        new URL("/settings?error=no_email", request.url)
      );
    }

    // Calculate expiry date
    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);

    // Save connection
    await saveGmailConnection(
      session.user.id,
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      email
    );

    return NextResponse.redirect(
      new URL("/settings?success=gmail_connected", request.url)
    );
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=callback_failed", request.url)
    );
  }
}
