import { readFile } from "node:fs/promises";
import path from "node:path";
import { queryFixture } from "@/lib/fixtureQueries";

/**
 * Local content source: serves API envelopes from JSON files instead of the
 * backend, selected with CONTENT_SOURCE=fixtures.
 *
 * Two jobs, one set of files:
 *
 * 1. DESIGN PROOFS WITHOUT A BACKEND. The Bell Curve homepage has to be
 *    approved by the client before any admin is installed, so the proof has to
 *    render from something. The files hold exactly what /api/v1 would return,
 *    so the components under review are the production components, fed the
 *    production shape.
 * 2. THE SEED SOURCE. Once a layout is approved these files are what the
 *    backend seeder imports (pages, sections, flexible types, theme, menus).
 *    Authoring them in the envelope shape now means the seeder is a loader,
 *    not a translation.
 *
 * Static envelopes (config, layout, pages, quiz) are files. Collections that
 * the API filters and paginates (catalog, blog) are answered by
 * `lib/fixtureQueries.js`, which applies the same query params the endpoints
 * accept so the listing UI can be reviewed with working filters. Anything
 * unmapped answers like a 404, which every caller already handles.
 *
 * Server-only: reads the filesystem.
 */

const FIXTURE_ROOT = path.join(process.cwd(), "fixtures", process.env.FIXTURE_SET || "bch");

export function usingFixtures() {
  return process.env.CONTENT_SOURCE === "fixtures";
}

/** Maps an API path to a fixture file relative to the set root, or null. */
function fixtureFile(apiPath) {
  if (apiPath === "/config") {
    return "config.json";
  }

  if (apiPath === "/layout") {
    return "layout.json";
  }

  const page = apiPath.match(/^\/pages\/(.+)$/);
  if (page) {
    const slug = decodeURIComponent(page[1]);

    // Slugs may contain "/" (legal/privacy); never let one climb out of pages/.
    if (slug.split("/").some((part) => part === ".." || part === "")) {
      return null;
    }

    return path.join("pages", `${slug}.json`);
  }

  if (apiPath === "/quiz") {
    return path.join("quiz", "default.json");
  }

  const quiz = apiPath.match(/^\/quiz\/([a-z0-9-]+)$/);
  if (quiz) {
    return path.join("quiz", `${quiz[1]}.json`);
  }

  return null;
}

/** Reads one fixture file as JSON, or null when it does not exist. */
export async function readFixture(file) {
  try {
    return JSON.parse(await readFile(path.join(FIXTURE_ROOT, file), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

/**
 * Fixture counterpart of apiFetch: the parsed `{ data }` body, or null when
 * the path is unmapped or the file does not exist (a 404).
 */
export async function fixtureFetch(apiPath, searchParams = {}) {
  const file = fixtureFile(apiPath);

  if (file) {
    return readFixture(file);
  }

  return queryFixture(apiPath, searchParams, readFixture);
}
