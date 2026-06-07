import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadLocalEnv(fileName = '.env'): void {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts
      .join('=')
      .trim()
      .replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function numberFromEnv(
  key: string,
  fallback: number,
  minValue = 0,
): number {
  const parsed = Number(process.env[key]);

  if (Number.isFinite(parsed) && parsed >= minValue) {
    return parsed;
  }

  return fallback;
}

export function requiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} must be defined.`);
  }

  return value;
}

export function requiredNumberFromEnv(key: string, minValue = 0): number {
  const value = requiredEnv(key);
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < minValue) {
    throw new Error(
      `${key} must be a number greater than or equal to ${minValue}.`,
    );
  }

  return parsed;
}
