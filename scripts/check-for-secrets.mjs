#!/usr/bin/env node
/**
 * Guard against committing Supabase credentials.
 *
 * Fails the commit if a tracked file contains a service-role key, a JWT or a
 * filled-in .env file. Wired up automatically via the git `pre-commit` hook.
 *
 * Usage:
 *   node scripts/check-for-secrets.mjs            # scan staged files
 *   node scripts/check-for-secrets.mjs --install  # install the git hook
 *   node scripts/check-for-secrets.mjs --all      # scan every tracked file
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

const RED = "\u001b[0;31m";
const GREEN = "\u001b[0;32m";
const YELLOW = "\u001b[0;33m";
const NC = "\u001b[0m";

const repoRoot = execSync("git rev-parse --show-toplevel", {
  encoding: "utf8",
}).trim();

/**
 * Values that clearly are not real credentials.
 *
 * The scanner must not flag `.env.example`, the README or the local mock
 * server, all of which legitimately contain assignment lines with
 * placeholder values.
 */
const PLACEHOLDER_VALUE = /^(your[-_]|YOUR[-_]|<|\$\{|xxx|replace|\.\.\.|local[-_]mock[-_]|changeme|example|dummy|placeholder)/i;

/** Local addresses can never carry a real credential. */
const LOCAL_ADDRESS = /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i;

const RULES = [
  {
    name: "Supabase secret (sb_secret_) key",
    pattern: /sb_secret_[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "Supabase service-role JWT",
    pattern:
      /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    name: "Assigned SUPABASE_SERVICE_ROLE_KEY value",
    pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*(\S+)/,
    isPlaceholder: (value) => PLACEHOLDER_VALUE.test(value),
  },
  {
    name: "Assigned NEXT_PUBLIC_SUPABASE_ANON_KEY value",
    pattern: /NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(\S+)/,
    isPlaceholder: (value) => PLACEHOLDER_VALUE.test(value),
  },
  {
    name: "Assigned NEXT_PUBLIC_SUPABASE_URL value",
    pattern: /NEXT_PUBLIC_SUPABASE_URL\s*=\s*(\S+)/,
    isPlaceholder: (value) =>
      PLACEHOLDER_VALUE.test(value) ||
      /^https:\/\/your[-_]/i.test(value) ||
      LOCAL_ADDRESS.test(value),
  },
];

const BINARY_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".pdf",
  ".zip",
  ".mp4",
];

function git(args) {
  return execSync(`git ${args}`, { encoding: "utf8", cwd: repoRoot });
}

function installHook() {
  const hooksDir = git("rev-parse --git-path hooks").trim();
  const hookPath = join(repoRoot, hooksDir, "pre-commit");
  const hook = `#!/usr/bin/env sh
exec node "$(git rev-parse --show-toplevel)/scripts/check-for-secrets.mjs"
`;
  writeFileSync(hookPath, hook, "utf8");
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    /* chmod is a no-op on Windows */
  }
  console.log(`${GREEN}pre-commit hook installed.${NC}`);
}

function isBinary(path) {
  return BINARY_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));
}

function collectFiles({ all }) {
  if (all) {
    return git("ls-files").split("\n").filter(Boolean);
  }
  return git("diff --cached --name-only --diff-filter=ACMR")
    .split("\n")
    .filter(Boolean);
}

function readStagedContent(path) {
  // Read from the index so unstaged working-copy edits are not scanned.
  try {
    return execSync(`git show ":${path}"`, {
      encoding: "utf8",
      cwd: repoRoot,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch {
    const absolute = join(repoRoot, path);
    return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--install")) {
    installHook();
    return;
  }

  const all = args.includes("--all");
  console.log(
    `${YELLOW}Scanning ${all ? "all tracked" : "staged"} files for exposed credentials...${NC}`,
  );

  const files = collectFiles({ all });

  if (files.length === 0) {
    console.log(`${GREEN}Nothing to scan.${NC}`);
    return;
  }

  // 1. Block any .env file other than the .env.example template.
  const envFiles = files.filter(
    (file) =>
      /(^|\/)\.env/.test(file) && !/\.env\.example$/.test(file),
  );

  if (envFiles.length > 0) {
    console.error(`${RED}ERROR: refusing to commit environment files:${NC}`);
    for (const file of envFiles) console.error(`  - ${file}`);
    console.error(
      `${YELLOW}Add them to .gitignore and commit .env.example as the template.${NC}`,
    );
    process.exit(1);
  }

  // 2. Scan file contents for real credentials.
  let found = 0;

  for (const file of files) {
    if (isBinary(file)) continue;

    const content = all
      ? readFileSync(join(repoRoot, file), "utf8")
      : readStagedContent(file);

    for (const rule of RULES) {
      const match = content.match(rule.pattern);
      if (!match) continue;

      // Rules with a capture group can declare placeholder values to ignore.
      if (rule.isPlaceholder && match[1] && rule.isPlaceholder(match[1])) {
        continue;
      }

      console.error(`${RED}ERROR: '${file}' contains a ${rule.name}.${NC}`);
      found += 1;
    }
  }

  if (found > 0) {
    console.error(`${RED}Aborted - credentials would have been exposed.${NC}`);
    process.exit(1);
  }

  console.log(`${GREEN}No exposed credentials found.${NC}`);
}

main();
