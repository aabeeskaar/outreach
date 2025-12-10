import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await prisma.profile.create({
        data: {
          userId: session.user.id,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
      return NextResponse.json(newProfile);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Validate and sanitize input
    const updateData: Record<string, unknown> = {};

    if (typeof data.headline === "string") {
      updateData.headline = data.headline.slice(0, 200);
    }
    if (typeof data.bio === "string") {
      updateData.bio = data.bio.slice(0, 5000);
    }
    if (Array.isArray(data.skills)) {
      updateData.skills = data.skills.filter((s: unknown) => typeof s === "string").slice(0, 20);
    }
    if (Array.isArray(data.interests)) {
      updateData.interests = data.interests.filter((s: unknown) => typeof s === "string").slice(0, 20);
    }
    if (Array.isArray(data.education)) {
      updateData.education = data.education.slice(0, 10);
    }
    if (Array.isArray(data.experience)) {
      updateData.experience = data.experience.slice(0, 10);
    }
    if (typeof data.goals === "string") {
      updateData.goals = data.goals.slice(0, 2000);
    }
    if (typeof data.linkedinUrl === "string") {
      updateData.linkedinUrl = data.linkedinUrl.slice(0, 500);
    }
    if (typeof data.githubUrl === "string") {
      updateData.githubUrl = data.githubUrl.slice(0, 500);
    }
    if (typeof data.portfolioUrl === "string") {
      updateData.portfolioUrl = data.portfolioUrl.slice(0, 500);
    }
    if (Array.isArray(data.otherLinks)) {
      updateData.otherLinks = data.otherLinks.slice(0, 10);
    }

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Also update user name if provided
    if (typeof data.name === "string") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.name.slice(0, 100) },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
