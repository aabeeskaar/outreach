import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import {
  getEnvVars,
  createEnvVar,
  updateEnvVar,
  deleteEnvVar,
  isVercelConfigured,
  setEnvVariable,
  deleteEnvVariable,
} from "@/lib/vercel";

export async function GET() {
  try {
    await requireAdmin();

    if (!isVercelConfigured()) {
      return NextResponse.json({
        configured: false,
        envVars: [],
        error: "Vercel API not configured. Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID.",
      });
    }

    const envVars = await getEnvVars();

    // Sort by key name
    envVars.sort((a, b) => a.key.localeCompare(b.key));

    // Mask sensitive values for display
    const maskedEnvVars = envVars.map((env) => ({
      ...env,
      value: env.type === "secret" || env.type === "sensitive" ? "••••••••" : env.value,
      isSecret: env.type === "secret" || env.type === "sensitive",
    }));

    return NextResponse.json({
      configured: true,
      envVars: maskedEnvVars,
    });
  } catch (error) {
    console.error("Get env vars error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch environment variables";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    // Validate key format (uppercase with underscores)
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: "Key must be uppercase letters, numbers, and underscores, starting with a letter" },
        { status: 400 }
      );
    }

    const envVar = await createEnvVar({
      key,
      value,
      target: target || ["production", "preview", "development"],
      type: type || "encrypted",
    });

    // Also update local .env file if development is targeted
    const targets = target || ["production", "preview", "development"];
    if (targets.includes("development")) {
      try {
        await setEnvVariable(key, value);
      } catch (envError) {
        console.warn("Failed to update local .env file:", envError);
      }
    }

    await createAuditLog({
      userId: session.user?.id,
      action: "CREATE_ENV_VAR",
      entityType: "EnvVar",
      entityId: key,
      newValue: { key, target: envVar.target },
    });

    return NextResponse.json({ success: true, envVar });
  } catch (error) {
    console.error("Create env var error:", error);
    const message = error instanceof Error ? error.message : "Failed to create environment variable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const { id, value, target, type } = body;

    if (!id || value === undefined) {
      return NextResponse.json(
        { error: "ID and value are required" },
        { status: 400 }
      );
    }

    const envVar = await updateEnvVar(id, {
      value,
      target,
      type,
    });

    // Also update local .env file if development is targeted
    if (envVar.target.includes("development")) {
      try {
        await setEnvVariable(envVar.key, value);
      } catch (envError) {
        console.warn("Failed to update local .env file:", envError);
      }
    }

    await createAuditLog({
      userId: session.user?.id,
      action: "UPDATE_ENV_VAR",
      entityType: "EnvVar",
      entityId: envVar.key,
      newValue: { key: envVar.key, target: envVar.target },
    });

    return NextResponse.json({ success: true, envVar });
  } catch (error) {
    console.error("Update env var error:", error);
    const message = error instanceof Error ? error.message : "Failed to update environment variable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    // Also remove from local .env file
    if (key) {
      try {
        await deleteEnvVariable(key);
      } catch (envError) {
        console.warn("Failed to update local .env file:", envError);
      }
    }

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
