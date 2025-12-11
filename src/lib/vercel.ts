// Vercel API integration for environment variables management

const VERCEL_API_URL = "https://api.vercel.com";

interface VercelEnvVar {
  id?: string;
  key: string;
  value: string;
  target: ("production" | "preview" | "development")[];
  type: "plain" | "encrypted" | "secret" | "sensitive";
  gitBranch?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface VercelEnvResponse {
  envs: VercelEnvVar[];
}

function getVercelConfig() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error("VERCEL_API_TOKEN and VERCEL_PROJECT_ID are required");
  }

  return { token, projectId, teamId };
}

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function buildUrl(path: string, projectId: string, teamId?: string) {
  const url = new URL(`${VERCEL_API_URL}${path}`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }
  return url.toString();
}

export async function getEnvVars(): Promise<VercelEnvVar[]> {
  const { token, projectId, teamId } = getVercelConfig();

  const url = buildUrl(`/v9/projects/${projectId}/env`, projectId, teamId);
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch environment variables");
  }

  const data: VercelEnvResponse = await response.json();
  return data.envs;
}

export async function getEnvVar(envId: string): Promise<VercelEnvVar> {
  const { token, projectId, teamId } = getVercelConfig();

  const url = buildUrl(`/v9/projects/${projectId}/env/${envId}`, projectId, teamId);
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch environment variable");
  }

  return response.json();
}

export async function createEnvVar(envVar: {
  key: string;
  value: string;
  target: ("production" | "preview" | "development")[];
  type?: "plain" | "encrypted" | "secret" | "sensitive";
}): Promise<VercelEnvVar> {
  const { token, projectId, teamId } = getVercelConfig();

  const url = buildUrl(`/v10/projects/${projectId}/env`, projectId, teamId);
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({
      key: envVar.key,
      value: envVar.value,
      target: envVar.target,
      type: envVar.type || "encrypted",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create environment variable");
  }

  return response.json();
}

export async function updateEnvVar(
  envId: string,
  envVar: {
    value: string;
    target?: ("production" | "preview" | "development")[];
    type?: "plain" | "encrypted" | "secret" | "sensitive";
  }
): Promise<VercelEnvVar> {
  const { token, projectId, teamId } = getVercelConfig();

  const url = buildUrl(`/v9/projects/${projectId}/env/${envId}`, projectId, teamId);
  const response = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(token),
    body: JSON.stringify(envVar),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to update environment variable");
  }

  return response.json();
}

export async function deleteEnvVar(envId: string): Promise<void> {
  const { token, projectId, teamId } = getVercelConfig();

  const url = buildUrl(`/v9/projects/${projectId}/env/${envId}`, projectId, teamId);
  const response = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to delete environment variable");
  }
}

export function isVercelConfigured(): boolean {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

// Local .env file management
import { promises as fs } from "fs";
import path from "path";

const ENV_FILE_PATH = path.join(process.cwd(), ".env");

export async function readEnvFile(): Promise<Map<string, string>> {
  const envMap = new Map<string, string>();

  try {
    const content = await fs.readFile(ENV_FILE_PATH, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex);
        let value = trimmed.substring(equalIndex + 1);

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        envMap.set(key, value);
      }
    }
  } catch (error) {
    // File doesn't exist or can't be read
    console.log(".env file not found or cannot be read");
  }

  return envMap;
}

export async function writeEnvFile(envMap: Map<string, string>): Promise<void> {
  const lines: string[] = [];

  // Read existing file to preserve comments and order
  try {
    const content = await fs.readFile(ENV_FILE_PATH, "utf-8");
    const existingLines = content.split("\n");
    const processedKeys = new Set<string>();

    for (const line of existingLines) {
      const trimmed = line.trim();

      // Preserve comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) {
        lines.push(line);
        continue;
      }

      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex);

        if (envMap.has(key)) {
          // Update existing key
          const value = envMap.get(key)!;
          // Quote values that contain spaces or special characters
          const needsQuotes = value.includes(" ") || value.includes("#") || value.includes("=");
          lines.push(`${key}=${needsQuotes ? `"${value}"` : value}`);
          processedKeys.add(key);
        }
        // If key is not in envMap, it was deleted - don't add it
      } else {
        lines.push(line);
      }
    }

    // Add new keys that weren't in the original file
    for (const [key, value] of envMap) {
      if (!processedKeys.has(key)) {
        const needsQuotes = value.includes(" ") || value.includes("#") || value.includes("=");
        lines.push(`${key}=${needsQuotes ? `"${value}"` : value}`);
      }
    }
  } catch {
    // File doesn't exist, create new one
    for (const [key, value] of envMap) {
      const needsQuotes = value.includes(" ") || value.includes("#") || value.includes("=");
      lines.push(`${key}=${needsQuotes ? `"${value}"` : value}`);
    }
  }

  await fs.writeFile(ENV_FILE_PATH, lines.join("\n"), "utf-8");
}

export async function setEnvVariable(key: string, value: string): Promise<void> {
  const envMap = await readEnvFile();
  envMap.set(key, value);
  await writeEnvFile(envMap);
}

export async function deleteEnvVariable(key: string): Promise<void> {
  const envMap = await readEnvFile();
  envMap.delete(key);
  await writeEnvFile(envMap);
}

export async function getEnvVariable(key: string): Promise<string | undefined> {
  const envMap = await readEnvFile();
  return envMap.get(key);
}

export type { VercelEnvVar };
