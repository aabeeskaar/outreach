import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canGenerateEmail, incrementEmailUsage } from "@/lib/subscription";
import { generateEmail, getUserContext, getRecipientContext, getAvailableProviders, AIProvider } from "@/lib/ai";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute before generating more emails." },
        { status: 429 }
      );
    }

    // Check subscription/free tier limit
    const subscriptionCheck = await canGenerateEmail(session.user.id);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        {
          error: subscriptionCheck.reason,
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.recipientId) {
      return NextResponse.json(
        { error: "Recipient ID is required" },
        { status: 400 }
      );
    }

    const validPurposes = [
      "JOB_APPLICATION",
      "RESEARCH_INQUIRY",
      "COLLABORATION",
      "MENTORSHIP",
      "NETWORKING",
      "OTHER",
    ];
    const validTones = ["FORMAL", "FRIENDLY", "CONCISE", "ENTHUSIASTIC"];

    if (!validPurposes.includes(data.purpose)) {
      return NextResponse.json(
        { error: "Invalid email purpose" },
        { status: 400 }
      );
    }

    if (!validTones.includes(data.tone)) {
      return NextResponse.json(
        { error: "Invalid email tone" },
        { status: 400 }
      );
    }

    // Validate AI provider
    const validProviders: AIProvider[] = ["claude", "gemini"];
    const provider: AIProvider = validProviders.includes(data.provider) ? data.provider : "gemini";

    // Check if provider is available
    const availableProviders = getAvailableProviders();
    if (!availableProviders.includes(provider)) {
      return NextResponse.json(
        { error: `AI provider "${provider}" is not configured. Please add the API key in settings.` },
        { status: 400 }
      );
    }

    // Get user and recipient context
    const [userContext, recipientContext] = await Promise.all([
      getUserContext(session.user.id),
      getRecipientContext(data.recipientId, session.user.id),
    ]);

    // Generate email
    const result = await generateEmail({
      userContext,
      recipientContext,
      purpose: data.purpose,
      tone: data.tone,
      additionalContext: data.additionalContext,
      provider,
    });

    // Increment usage for free tier users
    await incrementEmailUsage(session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate email error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
