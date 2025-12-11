// Local .env file management
import { promises as fs } from "fs";
import path from "path";

const ENV_FILE_PATH = path.join(process.cwd(), ".env");

export interface EnvVariable {
  key: string;
  value: string;
}

export async function checkEnvFileExists(): Promise<boolean> {
  try {
    await fs.access(ENV_FILE_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function readEnvFile(): Promise<EnvVariable[]> {
  const envVars: EnvVariable[] = [];

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

        envVars.push({ key, value });
      }
    }
  } catch {
    // File doesn't exist or can't be read
    return [];
  }

  return envVars;
}

export async function writeEnvFile(envVars: EnvVariable[]): Promise<void> {
  const lines: string[] = [];
  const envMap = new Map(envVars.map(e => [e.key, e.value]));

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
    for (const { key, value } of envVars) {
      if (!processedKeys.has(key)) {
        const needsQuotes = value.includes(" ") || value.includes("#") || value.includes("=");
        lines.push(`${key}=${needsQuotes ? `"${value}"` : value}`);
      }
    }
  } catch {
    // File doesn't exist, create new one
    for (const { key, value } of envVars) {
      const needsQuotes = value.includes(" ") || value.includes("#") || value.includes("=");
      lines.push(`${key}=${needsQuotes ? `"${value}"` : value}`);
    }
  }

  await fs.writeFile(ENV_FILE_PATH, lines.join("\n"), "utf-8");
}

export async function addEnvVariable(key: string, value: string): Promise<void> {
  const envVars = await readEnvFile();

  // Check if key already exists
  const existingIndex = envVars.findIndex(e => e.key === key);
  if (existingIndex >= 0) {
    envVars[existingIndex].value = value;
  } else {
    envVars.push({ key, value });
  }

  await writeEnvFile(envVars);
}

export async function updateEnvVariable(key: string, value: string): Promise<void> {
  const envVars = await readEnvFile();
  const index = envVars.findIndex(e => e.key === key);

  if (index >= 0) {
    envVars[index].value = value;
    await writeEnvFile(envVars);
  } else {
    throw new Error(`Environment variable "${key}" not found`);
  }
}

export async function deleteEnvVariable(key: string): Promise<void> {
  const envVars = await readEnvFile();
  const filtered = envVars.filter(e => e.key !== key);
  await writeEnvFile(filtered);
}
