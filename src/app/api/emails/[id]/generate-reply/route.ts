import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getThreadMessages } from "@/lib/gmail";
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

    // Get email with Gmail thread ID
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

    if (!email.gmailThreadId) {
      return NextResponse.json(
        { error: "This email does not have a Gmail thread associated" },
        { status: 400 }
      );
    }

    // Check if any AI provider is available
    const availableProviders = getAvailableProviders();
    console.log("Available AI providers:", availableProviders);

    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: "No AI provider is configured. Please set up GOOGLE_GEMINI_API_KEY or GROQ_API_KEY." },
        { status: 503 }
      );
    }

    // Validate AI provider - use requested or first available
    const validProviders: AIProvider[] = ["gemini", "groq"];
    let provider: AIProvider = validProviders.includes(requestedProvider)
      ? requestedProvider
      : availableProviders[0]; // Use first available instead of defaulting to gemini

    // Check if selected provider is available
    if (!availableProviders.includes(provider)) {
      provider = availableProviders[0]; // Fallback to first available
    }

    // Get all messages in the thread
    const messages = await getThreadMessages(session.user.id, email.gmailThreadId);

    // Get the latest reply to respond to
    const latestReply = messages.filter((m) => !m.isFromMe).pop();

    if (!latestReply) {
      return NextResponse.json(
        { error: "No reply found to respond to" },
        { status: 400 }
      );
    }

    // Get user profile for context
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    // Build conversation context
    const conversationHistory = messages
      .map((m) => {
        const sender = m.isFromMe ? "Me" : email.recipient.name;
        // Strip HTML for context
        const cleanBody = m.body
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500);
        return `[${sender}]: ${cleanBody}`;
      })
      .join("\n\n");

    // Create prompt for AI
    const prompt = `You are helping someone write a professional email reply.

CONVERSATION HISTORY:
${conversationHistory}

RECIPIENT INFORMATION:
- Name: ${email.recipient.name}
- Email: ${email.recipient.email}
${email.recipient.organization ? `- Organization: ${email.recipient.organization}` : ""}
${email.recipient.role ? `- Role: ${email.recipient.role}` : ""}

${profile ? `SENDER INFORMATION:
- Name: ${session.user.name || "User"}
${profile.headline ? `- Title: ${profile.headline}` : ""}
${profile.skills?.length ? `- Skills: ${profile.skills.slice(0, 5).join(", ")}` : ""}
` : ""}

LATEST MESSAGE TO REPLY TO:
${latestReply.body.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()}

${additionalContext ? `ADDITIONAL CONTEXT FROM USER:\n${additionalContext}\n` : ""}

REQUIREMENTS:
- Write a ${tone || "professional"} reply to the latest message
- Be concise and to the point
- Maintain the conversation context
- Don't include a subject line, just the body
- Don't use placeholder text like [Your Name] - write a complete reply
- Start directly with the greeting (e.g., "Hi [Name]," or "Dear [Name],")

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
      replyingTo: {
        from: latestReply.from,
        snippet: latestReply.snippet,
        date: latestReply.date,
      },
    });
  } catch (error) {
    console.error("Generate reply error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error message:", errorMessage);

    // Return more specific error messages
    if (errorMessage.includes("API key not configured") || errorMessage.includes("not configured")) {
      return NextResponse.json(
        { error: "AI provider is not configured. Please contact administrator." },
        { status: 503 }
      );
    }
    if (errorMessage.includes("No Gmail connection")) {
      return NextResponse.json(
        { error: "Gmail is not connected. Please reconnect in settings." },
        { status: 400 }
      );
    }
    if (errorMessage.includes("refresh") || errorMessage.includes("token")) {
      return NextResponse.json(
        { error: "Gmail session expired. Please reconnect Gmail in settings." },
        { status: 401 }
      );
    }
    if (errorMessage.includes("No response") || errorMessage.includes("parse")) {
      return NextResponse.json(
        { error: "AI failed to generate a response. Please try again." },
        { status: 500 }
      );
    }

    // Return the actual error in development for debugging
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? errorMessage : "Failed to generate reply. Please try again." },
      { status: 500 }
    );
  }
}
