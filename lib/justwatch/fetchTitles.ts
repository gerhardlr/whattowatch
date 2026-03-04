/**
 * JustWatch title-fetching client.
 *
 * Implements two sync strategies:
 *
 * Full sync (fetchAllTitles) — used by the legacy single-invocation route:
 *   Pass 1: unfiltered popular titles per provider (one provider at a time).
 *   Pass 2: genre-filtered pass across all providers to capture long-tail titles.
 *
 * Step-based sync (fetchProviderPage / fetchGenrePage) — used by the chained
 *   step route to stay within Vercel's 60s function timeout per invocation.
 *   Each function fetches up to `maxPages` pages and returns a cursor so the
 *   next step can resume where this one left off.
 *
 * Titles from duplicate JustWatch nodes are merged via mergeFlags so that a
 * title appearing under multiple providers accumulates all its service flags.
 *
 * Rate-limit handling: JustWatch proxies Elasticsearch 429s as GraphQL errors
 * with HTTP 200. fetchPage detects these and retries with exponential back-off.
 */
import config from "./config";
import type { JWTitle, JWGenre } from "@/types";
import { TITLES_QUERY } from "./queries";

interface JWNode {
  id: string;
  objectType: string;
  content: {
    title: string;
    originalReleaseYear: number | null;
    posterUrl: string | null;
    genres: Array<{ translation: string }>;
    externalIds: { imdbId: string | null };
  };
  offers: Array<{
    monetizationType: string;
    package: { technicalName: string };
  }>;
}

interface JWPage {
  edges: Array<{ node: JWNode }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

function providersByType(
  offers: JWNode["offers"],
  types: string[]
): Set<string> {
  return new Set(
    offers
      .filter((o) => types.includes(o.monetizationType))
      .map((o) => o.package.technicalName)
  );
}

function mapNode(node: JWNode): JWTitle {
  const free = providersByType(node.offers, ["FLATRATE"]);
  const pay = providersByType(node.offers, ["RENT", "BUY"]);
  return {
    jwId: node.id,
    imdbId: node.content.externalIds?.imdbId ?? null,
    title: node.content.title,
    year: node.content.originalReleaseYear ?? null,
    type: node.objectType === "SHOW" ? "show" : "movie",
    genres: node.content.genres?.map((g) => g.translation) ?? [],
    posterUrl: node.content.posterUrl
      ? `https://images.justwatch.com${node.content.posterUrl.replace("{format}", "jpg")}`
      : null,
    onNetflix: free.has("netflix"),
    onPrime: free.has("amazonprimevideo"),
    onPrimePay: pay.has("amazonprimevideo"),
    onDisney: free.has("disneyplus"),
    onApple: free.has("appletvplus"),
    onApplePay: pay.has("appletvplus"),
  };
}

function mergeFlags(existing: JWTitle, offers: JWNode["offers"]) {
  const free = providersByType(offers, ["FLATRATE"]);
  const pay = providersByType(offers, ["RENT", "BUY"]);
  if (free.has("netflix")) existing.onNetflix = true;
  if (free.has("amazonprimevideo")) existing.onPrime = true;
  if (pay.has("amazonprimevideo")) existing.onPrimePay = true;
  if (free.has("disneyplus")) existing.onDisney = true;
  if (free.has("appletvplus")) existing.onApple = true;
  if (pay.has("appletvplus")) existing.onApplePay = true;
}

async function fetchPage(
  providers: string[],
  cursor: string | null,
  genres?: string[]
): Promise<JWPage> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: TITLES_QUERY,
        variables: {
          country: config.country,
          language: config.language,
          first: 100,
          after: cursor ?? undefined,
          packages: providers,
          ...(genres ? { genres } : {}),
        },
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`JustWatch API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    // JustWatch proxies ES rate limits as a GraphQL error with HTTP 200
    if (json.errors) {
      const is429 = json.errors.some((e: { message: string }) => e.message.includes("429"));
      if (is429 && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      throw new Error(`JustWatch GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    return json.data.popularTitles as JWPage;
  }

  throw new Error("JustWatch API: max retries exceeded");
}

async function fetchProviderPages(
  titleMap: Map<string, JWTitle>,
  providers: string[],
  genres?: string[]
) {
  let cursor: string | null = null;
  let hasNext = true;
  let pageCount = 0;

  while (hasNext && pageCount < 50) {
    const page = await fetchPage(providers, cursor, genres);

    for (const { node } of page.edges) {
      const existing = titleMap.get(node.id);
      if (existing) {
        mergeFlags(existing, node.offers);
      } else {
        titleMap.set(node.id, mapNode(node));
      }
    }

    hasNext = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
    pageCount++;

    const label = genres ? `genre:${genres[0]}` : `provider:${providers[0]}`;
    console.log(`  [jw] ${label} page ${pageCount} — ${titleMap.size} titles so far`);

    if (hasNext) await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Fetches the complete catalog in a single async call (provider pass + genre pass).
 * Suitable for scripts and local runs; use fetchProviderPage/fetchGenrePage for
 * Vercel deployments where execution time is bounded.
 */
export async function fetchAllTitles(genres: JWGenre[] = []): Promise<JWTitle[]> {
  const titleMap = new Map<string, JWTitle>();

  // Pass 1: unfiltered popular titles — one provider at a time for per-provider ranking
  for (const provider of config.providers) {
    await fetchProviderPages(titleMap, [provider]);
  }

  // Pass 2: genre-filtered passes — all providers together to minimise API calls (19 vs 57)
  for (const genre of genres) {
    await fetchProviderPages(titleMap, [...config.providers], [genre.id]);
    // Breathe between genres to avoid hitting the JustWatch/ES rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  return Array.from(titleMap.values());
}

/** Fetch up to maxPages pages for a single provider starting from startCursor.
 *  Returns titles found, the next cursor (null if done), and whether more pages remain.
 *  Keeps each sync step within Vercel's 60s function timeout. */
export async function fetchProviderPage(
  provider: string,
  startCursor: string | null,
  maxPages: number
): Promise<{ titles: JWTitle[]; nextCursor: string | null; hasMore: boolean }> {
  const titleMap = new Map<string, JWTitle>();
  let cursor = startCursor;
  let hasNext = true;
  let pageCount = 0;

  while (hasNext && pageCount < maxPages) {
    const page = await fetchPage([provider], cursor);

    for (const { node } of page.edges) {
      const existing = titleMap.get(node.id);
      if (existing) {
        mergeFlags(existing, node.offers);
      } else {
        titleMap.set(node.id, mapNode(node));
      }
    }

    hasNext = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
    pageCount++;

    console.log(`  [jw] provider:${provider} page ${pageCount}/${maxPages} — ${titleMap.size} titles`);

    if (hasNext && pageCount < maxPages) await new Promise((r) => setTimeout(r, 100));
  }

  return {
    titles: Array.from(titleMap.values()),
    nextCursor: hasNext ? cursor : null,
    hasMore: hasNext,
  };
}

/** Fetch all pages for a single provider. Used by the step-based sync. */
export async function fetchProviderTitles(provider: string): Promise<JWTitle[]> {
  const titleMap = new Map<string, JWTitle>();
  await fetchProviderPages(titleMap, [provider]);
  return Array.from(titleMap.values());
}

/** Fetch up to maxPages pages for a single genre starting from startCursor.
 *  Same pagination contract as fetchProviderPage. */
export async function fetchGenrePage(
  genreId: string,
  startCursor: string | null,
  maxPages: number
): Promise<{ titles: JWTitle[]; nextCursor: string | null; hasMore: boolean }> {
  const titleMap = new Map<string, JWTitle>();
  let cursor = startCursor;
  let hasNext = true;
  let pageCount = 0;

  while (hasNext && pageCount < maxPages) {
    const page = await fetchPage([...config.providers], cursor, [genreId]);

    for (const { node } of page.edges) {
      const existing = titleMap.get(node.id);
      if (existing) {
        mergeFlags(existing, node.offers);
      } else {
        titleMap.set(node.id, mapNode(node));
      }
    }

    hasNext = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
    pageCount++;

    console.log(`  [jw] genre:${genreId} page ${pageCount}/${maxPages} — ${titleMap.size} titles`);

    if (hasNext && pageCount < maxPages) await new Promise((r) => setTimeout(r, 100));
  }

  return {
    titles: Array.from(titleMap.values()),
    nextCursor: hasNext ? cursor : null,
    hasMore: hasNext,
  };
}

/** Fetch all pages for a single genre across all providers. */
export async function fetchGenreTitles(genreId: string): Promise<JWTitle[]> {
  const titleMap = new Map<string, JWTitle>();
  await fetchProviderPages(titleMap, [...config.providers], [genreId]);
  return Array.from(titleMap.values());
}
