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

export type { VercelEnvVar };
