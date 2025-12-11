import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Groq from "groq-sdk";
import prisma from "./prisma";

// Initialize AI clients
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const gemini = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export type AIProvider = "claude" | "gemini" | "chatgpt" | "groq";

interface UserContext {
  name: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>;
  goals: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  documentSummaries: Array<{
    name: string;
    type: string;
    content: string;
  }>;
}

interface RecipientContext {
  name: string;
  email: string;
  organization: string | null;
  role: string | null;
  website: string | null;
  linkedinUrl: string | null;
  workFocus: string | null;
  additionalNotes: string | null;
}

type EmailPurpose =
  | "JOB_APPLICATION"
  | "RESEARCH_INQUIRY"
  | "COLLABORATION"
  | "MENTORSHIP"
  | "NETWORKING"
  | "OTHER";

type EmailTone = "FORMAL" | "FRIENDLY" | "CONCISE" | "ENTHUSIASTIC";

interface GenerateEmailParams {
  userContext: UserContext;
  recipientContext: RecipientContext;
  purpose: EmailPurpose;
  tone: EmailTone;
  additionalContext?: string;
  provider?: AIProvider;
}

const SYSTEM_PROMPT = `You are an expert professional email writer. Your task is to craft compelling, personalized emails that help users make meaningful professional connections. You excel at:

1. Writing personalized opening hooks that reference specific aspects of the recipient's work
2. Clearly articulating the sender's relevant qualifications and genuine interest
3. Creating compelling calls-to-action that encourage responses
4. Maintaining appropriate tone and formality based on context
5. Keeping emails concise yet impactful

IMPORTANT GUIDELINES:
- Always personalize the email based on the recipient's background and work
- Highlight specific overlaps between the sender's experience and recipient's interests
- Be genuine and avoid generic platitudes
- Keep emails between 150-300 words unless more detail is necessary
- Use proper email formatting with clear paragraphs
- Never fabricate or exaggerate the sender's qualifications
- If information is limited, focus on what is known rather than making assumptions
- NEVER use placeholder text like [your field], [specific area], [relevant field/area], etc. Use actual information provided or write generically without brackets.
- NEVER leave any text in square brackets [] in the output

OUTPUT FORMAT:
Return your response as valid JSON with exactly two fields:
- "subject": A compelling email subject line (max 60 characters, no colons at the start)
- "body": The email body in plain text with actual line breaks (not literal \\n characters)

Example format:
{"subject": "Interest in Research Collaboration", "body": "Dear Dr. Smith,

I am writing to express my interest in your research work...

Best regards,
John"}

Do not include any text outside the JSON object. Do not use markdown code blocks.`;

const PURPOSE_DESCRIPTIONS: Record<EmailPurpose, string> = {
  JOB_APPLICATION:
    "Applying for a job or expressing interest in career opportunities at the recipient's organization",
  RESEARCH_INQUIRY:
    "Expressing interest in research collaboration, PhD/postdoc positions, or learning more about the recipient's research",
  COLLABORATION:
    "Proposing a professional collaboration, partnership, or joint project",
  MENTORSHIP:
    "Seeking mentorship, career guidance, or professional advice from the recipient",
  NETWORKING:
    "Building professional connections and expanding network in the industry",
  OTHER: "General professional outreach for purposes not covered above",
};

const TONE_DESCRIPTIONS: Record<EmailTone, string> = {
  FORMAL: "Professional and formal tone, suitable for senior professionals or academic settings",
  FRIENDLY:
    "Warm and approachable while maintaining professionalism, good for peers or startup environments",
  CONCISE:
    "Brief and to-the-point, respecting the recipient's time while still being personable",
  ENTHUSIASTIC:
    "Energetic and passionate, showing genuine excitement about the opportunity",
};

function buildUserContextSection(user: UserContext): string {
  const sections: string[] = [];

  if (user.name) {
    sections.push(`Name: ${user.name}`);
  }

  if (user.headline) {
    sections.push(`Professional Headline: ${user.headline}`);
  }

  if (user.bio) {
    sections.push(`Bio: ${user.bio}`);
  }

  if (user.skills.length > 0) {
    sections.push(`Skills: ${user.skills.join(", ")}`);
  }

  if (user.interests.length > 0) {
    sections.push(`Interests: ${user.interests.join(", ")}`);
  }

  if (user.education.length > 0) {
    const eduStr = user.education
      .map((e) => `${e.degree} in ${e.field} from ${e.institution} (${e.year})`)
      .join("; ");
    sections.push(`Education: ${eduStr}`);
  }

  if (user.experience.length > 0) {
    const expStr = user.experience
      .map((e) => `${e.role} at ${e.company} (${e.duration}): ${e.description}`)
      .join("; ");
    sections.push(`Experience: ${expStr}`);
  }

  if (user.goals) {
    sections.push(`Goals: ${user.goals}`);
  }

  const links: string[] = [];
  if (user.linkedinUrl) links.push(`LinkedIn: ${user.linkedinUrl}`);
  if (user.githubUrl) links.push(`GitHub: ${user.githubUrl}`);
  if (user.portfolioUrl) links.push(`Portfolio: ${user.portfolioUrl}`);
  if (links.length > 0) {
    sections.push(`Links: ${links.join(", ")}`);
  }

  if (user.documentSummaries.length > 0) {
    const docStr = user.documentSummaries
      .map((d) => `[${d.type}] ${d.name}: ${d.content.slice(0, 500)}...`)
      .join("\n\n");
    sections.push(`Relevant Documents:\n${docStr}`);
  }

  return sections.join("\n\n");
}

function buildRecipientContextSection(recipient: RecipientContext): string {
  const sections: string[] = [];

  sections.push(`Name: ${recipient.name}`);
  sections.push(`Email: ${recipient.email}`);

  if (recipient.organization) {
    sections.push(`Organization: ${recipient.organization}`);
  }

  if (recipient.role) {
    sections.push(`Role/Position: ${recipient.role}`);
  }

  if (recipient.workFocus) {
    sections.push(`Research/Work Focus: ${recipient.workFocus}`);
  }

  if (recipient.website) {
    sections.push(`Website: ${recipient.website}`);
  }

  if (recipient.linkedinUrl) {
    sections.push(`LinkedIn: ${recipient.linkedinUrl}`);
  }

  if (recipient.additionalNotes) {
    sections.push(`Additional Notes: ${recipient.additionalNotes}`);
  }

  return sections.join("\n");
}

function buildPrompt(params: GenerateEmailParams): string {
  const userContextStr = buildUserContextSection(params.userContext);
  const recipientContextStr = buildRecipientContextSection(params.recipientContext);

  return `Generate a professional email with the following context:

## Email Purpose
${PURPOSE_DESCRIPTIONS[params.purpose]}

## Desired Tone
${TONE_DESCRIPTIONS[params.tone]}

## Sender's Background
${userContextStr}

## Recipient's Information
${recipientContextStr}

${params.additionalContext ? `## Additional Context\n${params.additionalContext}` : ""}

Please generate a compelling, personalized email that:
1. Opens with a personalized hook referencing the recipient's work or background
2. Clearly states the purpose of the email
3. Highlights relevant qualifications and experience from the sender
4. Shows genuine interest and alignment with the recipient's work
5. Ends with a clear, appropriate call-to-action

Return the response as JSON with "subject" and "body" fields only.`;
}

async function generateWithClaude(prompt: string): Promise<{ subject: string; body: string }> {
  if (!anthropic) {
    throw new Error("Anthropic API key not configured");
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  return parseAIResponse(content.text);
}

async function generateWithGemini(prompt: string): Promise<{ subject: string; body: string }> {
  if (!gemini) {
    throw new Error("Google Gemini API key not configured");
  }

  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();

  return parseAIResponse(text);
}

async function generateWithChatGPT(prompt: string): Promise<{ subject: string; body: string }> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from ChatGPT");
  }

  return parseAIResponse(content);
}

async function generateWithGroq(prompt: string): Promise<{ subject: string; body: string }> {
  if (!groq) {
    throw new Error("Groq API key not configured");
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from Groq");
  }

  return parseAIResponse(content);
}

function cleanEmailOutput(subject: string, body: string): { subject: string; body: string } {
  // Clean subject: remove leading colons, trim whitespace
  let cleanSubject = subject
    .replace(/^[:：\s]+/, '') // Remove leading colons and whitespace
    .replace(/\\n/g, ' ')     // Replace any escaped newlines with space
    .trim();

  // Clean body: convert literal \n to actual newlines, remove placeholder brackets
  let cleanBody = body
    .replace(/\\n\\n/g, '\n\n')  // Convert \\n\\n to double newline
    .replace(/\\n/g, '\n')        // Convert \\n to single newline
    .replace(/\\r/g, '')          // Remove carriage returns
    .replace(/\\t/g, '  ')        // Convert tabs to spaces
    .replace(/\\"/g, '"')         // Unescape quotes
    .replace(/\[([^\]]*)\]/g, '') // Remove any [placeholder] text
    .replace(/\n{3,}/g, '\n\n')   // Normalize multiple newlines to max 2
    .trim();

  return { subject: cleanSubject, body: cleanBody };
}

function parseAIResponse(text: string): { subject: string; body: string } {
  console.log("AI Response to parse:", text.slice(0, 1000));

  try {
    // Clean the text - remove markdown code blocks if present
    let cleanText = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try to find and parse JSON response
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];

      // Try to parse as-is first
      try {
        const result = JSON.parse(jsonStr);
        if (result.subject && result.body) {
          return cleanEmailOutput(result.subject, result.body);
        }
      } catch (e) {
        console.log("Direct JSON parse failed:", e);
      }

      // Try to fix common JSON issues
      try {
        // Replace unescaped newlines in strings
        const fixedJson = jsonStr
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        const result = JSON.parse(fixedJson);
        if (result.subject && result.body) {
          return cleanEmailOutput(result.subject, result.body);
        }
      } catch (e) {
        console.log("Fixed JSON parse failed:", e);
      }

      // Try to extract subject and body using regex
      const subjectMatch = jsonStr.match(/"subject"\s*:\s*"([^"]+)"/);
      const bodyMatch = jsonStr.match(/"body"\s*:\s*"([\s\S]*?)(?:"\s*\}|"$)/);

      if (subjectMatch) {
        let bodyContent = '';
        if (bodyMatch) {
          bodyContent = bodyMatch[1];
        } else {
          // Try to get everything after "body": "
          const bodyStart = jsonStr.indexOf('"body"');
          if (bodyStart !== -1) {
            const afterBody = jsonStr.slice(bodyStart);
            const contentMatch = afterBody.match(/"body"\s*:\s*"([\s\S]*)$/);
            if (contentMatch) {
              bodyContent = contentMatch[1].replace(/"\s*\}\s*$/, '');
            }
          }
        }

        if (bodyContent) {
          return cleanEmailOutput(subjectMatch[1], bodyContent);
        }
      }
    }

    // Fallback: Try to extract from markdown or plain text
    let subject = '';
    let body = '';

    // Look for Subject: pattern
    const subjectPatterns = [
      /subject[:\s]*["']?([^"'\n]+)["']?/i,
      /\*\*subject\*\*[:\s]*["']?([^"'\n]+)["']?/i,
    ];

    for (const pattern of subjectPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        subject = match[1].trim();
        break;
      }
    }

    // Look for Body: pattern or Dear/Hi greeting
    const bodyPatterns = [
      /body[:\s]*["']?([\s\S]+)$/i,
      /\*\*body\*\*[:\s]*["']?([\s\S]+)$/i,
      /(Dear\s+[\s\S]+)/i,
      /(Hi\s+[\s\S]+)/i,
      /(Hello\s+[\s\S]+)/i,
    ];

    for (const pattern of bodyPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        body = match[1]
          .replace(/^["']|["']$/g, '')
          .replace(/\}\s*$/, '')
          .trim();
        break;
      }
    }

    if (subject && body) {
      return cleanEmailOutput(subject, body);
    }

    // Last resort: use first line as subject, rest as body
    const lines = cleanText.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      return cleanEmailOutput(
        lines[0].replace(/^["'{}\[\]]+|["'{}\[\]]+$/g, '').slice(0, 100),
        lines.slice(1).join('\n').replace(/^["'{}\[\]]+|["'{}\[\]]+$/g, '')
      );
    }

    throw new Error("Could not parse AI response");
  } catch (error) {
    console.error("Parse error:", error, "Original text:", text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
}

export async function generateEmail(params: GenerateEmailParams): Promise<{
  subject: string;
  body: string;
}> {
  const prompt = buildPrompt(params);
  const provider = params.provider || "gemini"; // Default to Gemini (free)

  if (provider === "claude") {
    return generateWithClaude(prompt);
  } else if (provider === "chatgpt") {
    return generateWithChatGPT(prompt);
  } else if (provider === "groq") {
    return generateWithGroq(prompt);
  } else {
    return generateWithGemini(prompt);
  }
}

export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  if (process.env.GOOGLE_GEMINI_API_KEY) {
    providers.push("gemini");
  }

  if (process.env.GROQ_API_KEY) {
    providers.push("groq");
  }

  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your-anthropic-api-key") {
    providers.push("claude");
  }

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key") {
    providers.push("chatgpt");
  }

  return providers;
}

export async function getUserContext(userId: string): Promise<UserContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      documents: {
        where: {
          extractedText: { not: null },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    name: user.name,
    headline: user.profile?.headline || null,
    bio: user.profile?.bio || null,
    skills: user.profile?.skills || [],
    interests: user.profile?.interests || [],
    education: Array.isArray(user.profile?.education)
      ? (user.profile.education as UserContext["education"])
      : [],
    experience: Array.isArray(user.profile?.experience)
      ? (user.profile.experience as UserContext["experience"])
      : [],
    goals: user.profile?.goals || null,
    linkedinUrl: user.profile?.linkedinUrl || null,
    githubUrl: user.profile?.githubUrl || null,
    portfolioUrl: user.profile?.portfolioUrl || null,
    documentSummaries: user.documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      content: doc.extractedText || "",
    })),
  };
}

export async function getRecipientContext(
  recipientId: string,
  userId: string
): Promise<RecipientContext> {
  const recipient = await prisma.recipient.findFirst({
    where: {
      id: recipientId,
      userId,
    },
  });

  if (!recipient) {
    throw new Error("Recipient not found");
  }

  return {
    name: recipient.name,
    email: recipient.email,
    organization: recipient.organization,
    role: recipient.role,
    website: recipient.website,
    linkedinUrl: recipient.linkedinUrl,
    workFocus: recipient.workFocus,
    additionalNotes: recipient.additionalNotes,
  };
}
