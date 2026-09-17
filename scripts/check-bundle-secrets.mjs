#!/usr/bin/env node
/**
 * Fails the build if a secret reached the client bundle.
 *
 * The client bundle is public: anything Vite inlines into it is published to
 * every visitor. The most common way that happens is renaming a variable to
 * VITE_* to "make it work in the frontend" — Vite substitutes every VITE_*
 * reference at build time, so the key ships in plain text.
 *
 * Two independent checks run:
 *   1. Known secret shapes (Google API keys, Postgres URLs, PEM blocks).
 *   2. The literal values of sensitive environment variables that are present
 *      while building. This is the stronger check — it catches a leaked secret
 *      whatever shape it has — and it works on Vercel, where project
 *      environment variables are available to the build.
 *
 * Server output (dist/server.cjs) is excluded: it legitimately contains
 * `process.env.GEMINI_API_KEY` references, and it never reaches a browser.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST_DIR = process.argv[2] ?? 'dist';

/** Bundled server output, not served to browsers. */
const EXCLUDED = [/^server\.cjs/];

/** Extensions worth scanning; images and fonts cannot leak a readable key. */
const SCANNED_EXTENSIONS = ['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.map', '.txt'];

/** Env vars whose *values* must never appear in client output. */
const SENSITIVE_ENV_VARS = [
  'GEMINI_API_KEY',
  'ADMIN_TOKEN',
  'DATABASE_URL',
  'PGPASSWORD',
];

/**
 * A short or placeholder value would match half the bundle by coincidence, so
 * only values long enough to be real secrets are searched for.
 */
const MIN_SECRET_LENGTH = 12;
const PLACEHOLDER_VALUES = new Set([
  'MY_GEMINI_API_KEY',
  'MY_APP_URL',
  'changeme',
  'placeholder',
]);

const PATTERNS = [
  {
    name: 'Google API key',
    regex: /AIza[0-9A-Za-z_-]{30,}/,
    hint: 'A Gemini/Google API key is in the client bundle. Keys belong in src/server/ai/client.ts, read server-side only.',
  },
  {
    name: 'Postgres connection string with credentials',
    regex: /postgres(?:ql)?:\/\/[^\s'"]*:[^\s'"@]+@/,
    hint: 'A database URL with a password is in the client bundle. The browser must never hold database credentials.',
  },
  {
    name: 'Private key block',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    hint: 'A private key is in the client bundle.',
  },
  {
    name: 'Inlined VITE_ secret variable',
    // Vite replaces import.meta.env.VITE_* at build time, so a *surviving*
    // reference to a secret-sounding VITE_ name means the name itself was
    // written into the output — worth flagging either way.
    regex: /VITE_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Z0-9_]*/,
    hint: 'A VITE_-prefixed secret name reached the bundle. Vite inlines every VITE_* value into public client code — never prefix a secret with VITE_.',
  },
];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function shouldScan(relativePath) {
  if (EXCLUDED.some((pattern) => pattern.test(relativePath))) return false;
  return SCANNED_EXTENSIONS.some((ext) => relativePath.endsWith(ext));
}

function sensitiveEnvEntries() {
  return SENSITIVE_ENV_VARS.map((name) => [name, process.env[name]]).filter(
    ([, value]) =>
      typeof value === 'string' &&
      value.length >= MIN_SECRET_LENGTH &&
      !PLACEHOLDER_VALUES.has(value),
  );
}

function main() {
  const files = walk(DIST_DIR)
    .map((file) => relative(DIST_DIR, file))
    .filter(shouldScan);

  if (files.length === 0) {
    console.error(`Secret scan: no scannable files under ${DIST_DIR}/. Did the build run?`);
    process.exit(1);
  }

  const envEntries = sensitiveEnvEntries();
  const findings = [];

  for (const file of files) {
    const contents = readFileSync(join(DIST_DIR, file), 'utf8');

    for (const pattern of PATTERNS) {
      if (pattern.regex.test(contents)) {
        findings.push({ file, what: pattern.name, hint: pattern.hint });
      }
    }

    for (const [name] of envEntries) {
      // Never print the value itself — this output lands in CI logs.
      if (contents.includes(process.env[name])) {
        findings.push({
          file,
          what: `value of $${name}`,
          hint: `The literal value of ${name} is in client output. Remove any VITE_ alias and keep it server-side.`,
        });
      }
    }
  }

  if (findings.length > 0) {
    console.error('\n  SECRET SCAN FAILED — build output must not ship secrets\n');
    for (const finding of findings) {
      console.error(`  ${DIST_DIR}/${finding.file}`);
      console.error(`    found: ${finding.what}`);
      console.error(`    ${finding.hint}\n`);
    }
    process.exit(1);
  }

  const envNote = envEntries.length > 0
    ? `${envEntries.length} env value(s)`
    : 'no sensitive env vars set during build';
  console.log(`Secret scan passed: ${files.length} client file(s), ${PATTERNS.length} patterns, ${envNote}.`);
}

main();
