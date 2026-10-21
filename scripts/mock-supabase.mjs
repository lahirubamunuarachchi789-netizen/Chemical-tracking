/**
 * Local mock of the Supabase PostgREST API.
 *
 * It is NOT part of the application - it exists purely so the auth flow can be
 * exercised end-to-end (register -> login -> session cookie -> dashboard ->
 * logout) without a live Supabase project. Run it with:
 *
 *   node scripts/mock-supabase.mjs
 *
 * It listens on http://127.0.0.1:54321 and stores users in memory.
 */
import { createServer } from "node:http";
import bcrypt from "bcryptjs";

const PORT = Number(process.env.MOCK_PORT || 54321);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** @type {Map<string, {id: string, username: string, password: string, created_at: string}>} */
const users = new Map();

function send(res, status, body, extraHeaders = {}) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    ...extraHeaders,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);

  const url = new URL(req.url, BASE_URL);
  console.log(`[mock] ${req.method} ${url.pathname}${url.search}`);

  if (!url.pathname.startsWith("/rest/v1/users")) {
    return send(res, 404, { message: "not found" });
  }

  // SELECT
  if (req.method === "GET") {
    const limit = Number(url.searchParams.get("limit") || "100");

    let rows = [...users.values()];

    // PostgREST filter operators arrive as `column=ilike.value`.
    const rawFilter = url.searchParams.get("username");
    if (rawFilter) {
      const value = rawFilter.includes(".")
        ? rawFilter.slice(rawFilter.indexOf(".") + 1)
        : rawFilter;
      const needle = value.replace(/^%/, "").replace(/%$/, "").toLowerCase();
      rows = rows.filter((u) => u.username.toLowerCase() === needle);
    }
    rows = rows.slice(0, limit);

    // PostgREST honours `select=` - only return the requested columns.
    const select = url.searchParams.get("select");
    if (select) {
      const cols = select.split(",").map((c) => c.trim());
      rows = rows.map((row) =>
        Object.fromEntries(Object.entries(row).filter(([k]) => cols.includes(k))),
      );
    }
    return send(res, 200, rows);
  }

  // INSERT
  if (req.method === "POST") {
    const body = await readBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return send(res, 400, { message: "username and password are required" });
    }
    if ([...users.values()].some((u) => u.username === username)) {
      return send(res, 409, {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      });
    }

    const row = {
      id: crypto.randomUUID(),
      username,
      password,
      created_at: new Date().toISOString(),
    };
    users.set(row.id, row);

    const wantsRow =
      (req.headers.prefer || "").includes("return=representation") ||
      (req.headers.prefer || "").includes("return=minimal") === false;

    if (wantsRow) {
      return send(res, 201, [{ id: row.id, username: row.username }], {
        "Content-Range": `0-0/*`,
      });
    }
    return send(res, 201, undefined, {
      "Content-Range": `0-0/*`,
    });
  }

  // UPDATE
  if (req.method === "PATCH") {
    const body = await readBody(req);
    const idFilter = url.searchParams.get("id") || "";
    const id = idFilter.replace(/^eq\./, "");

    const row = users.get(id);
    if (!row) return send(res, 200, [], { "Content-Range": `0-0/*` });

    Object.assign(row, body);
    return send(res, 200, [{ id: row.id, username: row.username }], {
      "Content-Range": `0-0/*`,
    });
  }

  return send(res, 405, { message: "method not allowed" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock] Supabase mock listening on ${BASE_URL}`);
});

// Convenience: allow seeding a user without going through the API.
if (process.env.MOCK_SEED_USER) {
  const username = process.env.MOCK_SEED_USER;
  const password = process.env.MOCK_SEED_PASSWORD || "admin123";
  const hash = bcrypt.hashSync(password, 10);
  const row = {
    id: crypto.randomUUID(),
    username,
    password: hash,
    created_at: new Date().toISOString(),
  };
  users.set(row.id, row);
  console.log(`[mock] seeded user "${username}"`);
}

// Convenience: seed a legacy row whose password is stored in PLAIN TEXT so the
// automatic bcrypt upgrade path can be exercised.
if (process.env.MOCK_SEED_LEGACY_USER) {
  const username = process.env.MOCK_SEED_LEGACY_USER;
  const password = process.env.MOCK_SEED_LEGACY_PASSWORD || "legacy123";
  const row = {
    id: crypto.randomUUID(),
    username,
    password, // intentionally NOT a bcrypt hash
    created_at: new Date().toISOString(),
  };
  users.set(row.id, row);
  console.log(`[mock] seeded legacy plaintext user "${username}"`);
}
