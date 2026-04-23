/**
 * Minimal script logger. Keeps output visible but redacts anything that
 * matches the secret-key regex.
 */
const REDACT_KEYS = /(secret|private|api[_-]?key|authorization)/i;

export function log(message: string, meta?: Record<string, unknown>): void {
  if (!meta) {
    console.log(`[scripts] ${message}`);
    return;
  }
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    safe[k] = REDACT_KEYS.test(k) ? "[redacted]" : v;
  }
  console.log(`[scripts] ${message}`, safe);
}

export function banner(title: string, lines: string[]): void {
  const bar = "━".repeat(Math.max(title.length + 4, 40));
  console.log(`\n${bar}\n  ${title}\n${bar}`);
  for (const line of lines) console.log(`  ${line}`);
  console.log(`${bar}\n`);
}
