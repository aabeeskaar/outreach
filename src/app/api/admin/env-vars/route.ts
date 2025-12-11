import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import {
  checkEnvFileExists,
  readEnvFile,
  addEnvVariable,
  updateEnvVariable,
  deleteEnvVariable,
} from "@/lib/env-file";

// GET - Read all environment variables from .env file
export async function GET() {
  try {
    await requireAdmin();

    const exists = await checkEnvFileExists();
    const envVars = await readEnvFile();

    return NextResponse.json({
      exists,
      envVars: envVars.map((env, index) => ({
        id: index.toString(),
        key: env.key,
        value: env.value,
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
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    // Validate key format (uppercase with underscores recommended but not required)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: "Key must start with a letter or underscore, followed by letters, numbers, or underscores" },
        { status: 400 }
      );
    }

    await addEnvVariable(key, value);

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
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    await updateEnvVariable(key, value);

    await createAuditLog({
      userId: session.user?.id,
      action: "UPDATE_ENV_VAR",
      entityType: "EnvVar",
      entityId: key,
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
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    await deleteEnvVariable(key);

    await createAuditLog({
      userId: session.user?.id,
      action: "DELETE_ENV_VAR",
      entityType: "EnvVar",
      entityId: key,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete env var error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete environment variable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
