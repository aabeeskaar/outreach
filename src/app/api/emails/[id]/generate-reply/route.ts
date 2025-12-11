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

    // Validate AI provider
    const validProviders: AIProvider[] = ["gemini", "groq"];
    const provider: AIProvider = validProviders.includes(requestedProvider)
      ? requestedProvider
      : "gemini";

    // Check if provider is available
    const availableProviders = getAvailableProviders();
    if (!availableProviders.includes(provider)) {
      return NextResponse.json(
        { error: `AI provider "${provider}" is not configured.` },
        { status: 400 }
      );
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
