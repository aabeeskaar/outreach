import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateEmailWithProvider, AIProvider, getAvailableProviders } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { tone, additionalContext, provider: requestedProvider } = await request.json();

    // Get email from database
    const email = await prisma.generatedEmail.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        recipient: true,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Check if any AI provider is available
    const availableProviders = getAvailableProviders();

    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: "No AI provider is configured. Please set up GOOGLE_GEMINI_API_KEY or GROQ_API_KEY." },
        { status: 503 }
      );
    }

    // Use requested provider or first available
    const validProviders: AIProvider[] = ["gemini", "groq"];
    let provider: AIProvider = validProviders.includes(requestedProvider)
      ? requestedProvider
      : availableProviders[0];

    if (!availableProviders.includes(provider)) {
      provider = availableProviders[0];
    }

    // Get user profile for context
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    // Create prompt for AI - use the original email as context
    const prompt = `You are helping someone write a professional email reply.

ORIGINAL EMAIL SENT:
To: ${email.recipient.name} (${email.recipient.email})
Subject: ${email.subject}
Body:
${email.body}

RECIPIENT INFORMATION:
- Name: ${email.recipient.name}
- Email: ${email.recipient.email}
${email.recipient.organization ? `- Organization: ${email.recipient.organization}` : ""}

${profile ? `SENDER INFORMATION:
- Name: ${session.user.name || "User"}
${profile.headline ? `- Title: ${profile.headline}` : ""}
` : ""}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ""}

REQUIREMENTS:
- Write a ${tone || "professional"} follow-up reply
- Be concise and to the point
- Don't include a subject line, just the body
- Don't use placeholder text like [Your Name] - write a complete reply
- Start directly with the greeting (e.g., "Hi ${email.recipient.name}," or "Dear ${email.recipient.name},")
- End with appropriate sign-off using the sender's name

Write only the email body, nothing else.`;

    // Generate reply using AI
    const generatedReply = await generateEmailWithProvider(prompt, provider);

    // Track AI usage
    try {
      await prisma.aIUsage.create({
        data: {
          userId: session.user.id,
          provider,
          model: provider === "gemini" ? "gemini-2.0-flash" : "llama-3.3-70b-versatile",
          success: true,
        },
      });
    } catch (trackError) {
      console.error("Failed to track AI usage:", trackError);
    }

    return NextResponse.json({
      reply: generatedReply,
    });
  } catch (error) {
    console.error("Generate reply error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Full error message:", errorMessage);

    if (errorMessage.includes("API key not configured") || errorMessage.includes("not configured")) {
      return NextResponse.json(
        { error: "AI provider is not configured. Please contact administrator." },
        { status: 503 }
      );
    }

    // Return actual error message for debugging
    return NextResponse.json(
      { error: `Error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
