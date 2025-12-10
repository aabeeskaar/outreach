import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import { extractText } from "unpdf";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const filePath = path.join(UPLOAD_DIR, document.filePath);
    const fileBuffer = await readFile(filePath);
    let extractedText = "";

    if (document.mimeType === "application/pdf") {
      try {
        const uint8Array = new Uint8Array(fileBuffer);
        const result = await extractText(uint8Array);
        // unpdf returns { totalPages, text } where text is string or array
        extractedText = Array.isArray(result.text) ? result.text.join("\n") : String(result.text || "");
      } catch (err) {
        console.error("PDF parse error:", err);
        return NextResponse.json(
          { error: "Failed to parse PDF" },
          { status: 500 }
        );
      }
    } else if (document.mimeType === "text/plain") {
      extractedText = fileBuffer.toString("utf-8");
    } else if (
      document.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      document.mimeType === "application/msword"
    ) {
      // For DOCX files, we'll use a basic approach
      // In production, you might want to use mammoth or similar library
      extractedText = fileBuffer.toString("utf-8").replace(/<[^>]*>/g, " ");
    }

    // Clean up extracted text
    extractedText = extractedText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50000); // Limit to 50k characters

    // Update document with extracted text
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { extractedText },
    });

    return NextResponse.json({
      success: true,
      extractedText: updatedDocument.extractedText,
    });
  } catch (error) {
    console.error("Extract text error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
