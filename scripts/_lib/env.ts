import fs from "node:fs";
import path from "node:path";

const QUOTED_VALUE_PATTERN = /^(['"])(.*)\1$/;

function parseEnvFile(contents: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    const quotedMatch = value.match(QUOTED_VALUE_PATTERN);
    if (quotedMatch) {
      value = quotedMatch[2];
    } else {
      const commentIndex = value.indexOf(" #");
      if (commentIndex >= 0) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    entries[key] = value;
  }

  return entries;
}

function applyEnvFile(filePath: string, protectedKeys: Set<string>) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const entries = parseEnvFile(fs.readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(entries)) {
    if (protectedKeys.has(key)) {
      continue;
    }

    process.env[key] = value;
  }
}

export function loadLocalEnv() {
  const protectedKeys = new Set(Object.keys(process.env));
  const root = process.cwd();

  applyEnvFile(path.resolve(root, ".env"), protectedKeys);
  applyEnvFile(path.resolve(root, ".env.local"), protectedKeys);
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured. Add it to .env.local or your shell environment.`);
  }

  return value;
}
