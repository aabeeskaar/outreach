import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const gemini = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

const EXTRACTION_PROMPT = `You are a professional resume parser. Analyze the following resume/CV text and extract structured information.

Return a JSON object with the following structure (use null for missing fields, empty arrays for missing lists):
{
  "name": "Full name of the person",
  "headline": "Professional headline/title (e.g., 'Software Engineer | ML Researcher')",
  "bio": "A brief professional summary/bio extracted or inferred from the resume (2-3 sentences)",
  "skills": ["skill1", "skill2", ...],
  "interests": ["interest1", "interest2", ...],
  "education": [
    {
      "institution": "University name",
      "degree": "Degree type (Bachelor's, Master's, PhD, etc.)",
      "field": "Field of study",
      "year": "Year or date range (e.g., '2020-2024' or '2024')"
    }
  ],
  "experience": [
    {
      "company": "Company name",
      "role": "Job title",
      "duration": "Date range (e.g., 'Jan 2022 - Present')",
      "description": "Brief description of responsibilities/achievements"
    }
  ],
  "goals": "Inferred career goals based on the resume content (or null if not clear)",
  "linkedinUrl": "LinkedIn URL if found",
  "githubUrl": "GitHub URL if found",
  "portfolioUrl": "Portfolio/personal website URL if found"
}

IMPORTANT:
- Extract real information from the resume, do not make up data
- For skills, include technical skills, programming languages, frameworks, tools, and soft skills
- For interests, include research interests, industry interests, or areas of focus mentioned
- Keep descriptions concise but informative
- Return ONLY valid JSON, no other text

Resume text:
`;

interface ExtractedProfile {
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
}

async function extractWithGemini(resumeText: string): Promise<ExtractedProfile> {
  if (!gemini) {
    throw new Error("Google Gemini API key not configured");
  }

  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(EXTRACTION_PROMPT + resumeText);
  const response = result.response;
  const text = response.text();

  return parseExtractedData(text);
}

async function extractWithClaude(resumeText: string): Promise<ExtractedProfile> {
  if (!anthropic) {
    throw new Error("Anthropic API key not configured");
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: EXTRACTION_PROMPT + resumeText,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  return parseExtractedData(content.text);
}

function parseExtractedData(text: string): ExtractedProfile {
  // Find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const data = JSON.parse(jsonMatch[0]);

  // Validate and sanitize the extracted data
  return {
    name: typeof data.name === "string" ? data.name : null,
    headline: typeof data.headline === "string" ? data.headline : null,
    bio: typeof data.bio === "string" ? data.bio : null,
    skills: Array.isArray(data.skills)
      ? data.skills.filter((s: unknown) => typeof s === "string").slice(0, 20)
      : [],
    interests: Array.isArray(data.interests)
      ? data.interests.filter((s: unknown) => typeof s === "string").slice(0, 20)
      : [],
    education: Array.isArray(data.education)
      ? data.education
          .filter(
            (e: unknown) =>
              typeof e === "object" && e !== null && "institution" in e
          )
          .slice(0, 10)
          .map((e: Record<string, unknown>) => ({
            institution: String(e.institution || ""),
            degree: String(e.degree || ""),
            field: String(e.field || ""),
            year: String(e.year || ""),
          }))
      : [],
    experience: Array.isArray(data.experience)
      ? data.experience
          .filter(
            (e: unknown) =>
              typeof e === "object" && e !== null && "company" in e
          )
          .slice(0, 10)
          .map((e: Record<string, unknown>) => ({
            company: String(e.company || ""),
            role: String(e.role || ""),
            duration: String(e.duration || ""),
            description: String(e.description || ""),
          }))
      : [],
    goals: typeof data.goals === "string" ? data.goals : null,
    linkedinUrl: typeof data.linkedinUrl === "string" ? data.linkedinUrl : null,
    githubUrl: typeof data.githubUrl === "string" ? data.githubUrl : null,
    portfolioUrl: typeof data.portfolioUrl === "string" ? data.portfolioUrl : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, provider = "gemini" } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get the document with extracted text
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (!document.extractedText) {
      return NextResponse.json(
        { error: "Document text has not been extracted. Please extract text first." },
        { status: 400 }
      );
    }

    // Extract profile data using AI
    let extractedProfile: ExtractedProfile;

    if (provider === "claude" && anthropic) {
      extractedProfile = await extractWithClaude(document.extractedText);
    } else if (gemini) {
      extractedProfile = await extractWithGemini(document.extractedText);
    } else {
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      extractedProfile,
    });
  } catch (error) {
    console.error("Extract profile error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
