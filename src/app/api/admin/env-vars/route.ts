import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import {
  getEnvVars,
  createEnvVar,
  updateEnvVar,
  deleteEnvVar,
  isVercelConfigured,
} from "@/lib/vercel";

// GET - Read all environment variables from Vercel
export async function GET() {
  try {
    await requireAdmin();

    if (!isVercelConfigured()) {
      return NextResponse.json({
        configured: false,
        envVars: [],
        message: "Vercel API not configured. Add VERCEL_API_TOKEN and VERCEL_PROJECT_ID to your environment variables.",
      });
    }

    const envVars = await getEnvVars();

    return NextResponse.json({
      configured: true,
      envVars: envVars.map((env) => ({
        id: env.id,
        key: env.key,
        value: env.value,
        target: env.target,
        type: env.type,
      })),
    });
  } catch (error) {
    console.error("Get env vars error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch environment variables";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Add new environment variable
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    if (!isVercelConfigured()) {
      return NextResponse.json(
        { error: "Vercel API not configured" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { key, value, target, type } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    // Validate key format
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: "Key must start with a letter or underscore, followed by letters, numbers, or underscores" },
        { status: 400 }
      );
    }

    await createEnvVar({
      key,
      value,
      target: target || ["production", "preview", "development"],
      type: type || "encrypted",
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "CREATE_ENV_VAR",
      entityType: "EnvVar",
      entityId: key,
      newValue: { key },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create env var error:", error);
    const message = error instanceof Error ? error.message : "Failed to create environment variable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Update existing environment variable
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();

    if (!isVercelConfigured()) {
      return NextResponse.json(
        { error: "Vercel API not configured" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { id, key, value, target, type } = body;

    if (!id || value === undefined) {
      return NextResponse.json(
        { error: "ID and value are required" },
        { status: 400 }
      );
    }

    await updateEnvVar(id, {
      value,
      target,
      type,
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "UPDATE_ENV_VAR",
      entityType: "EnvVar",
      entityId: key || id,
      newValue: { key },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update env var error:", error);
    const message = error instanceof Error ? error.message : "Failed to update environment variable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete environment variable
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();

    if (!isVercelConfigured()) {
      return NextResponse.json(
        { error: "Vercel API not configured" },
        { status: 400 }
      );
    }

    const { id, key } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await deleteEnvVar(id);

    await createAuditLog({
      userId: session.user?.id,
      action: "DELETE_ENV_VAR",
      entityType: "EnvVar",
      entityId: key || id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete env var error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete environment variable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
