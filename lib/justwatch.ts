const JUSTWATCH_GRAPHQL = "https://apis.justwatch.com/graphql";
const COUNTRY = "ZA";
const LANGUAGE = "en";

export type JWTitleType = "MOVIE" | "SHOW";

export interface JWTitle {
  jwId: string;
  imdbId: string | null;
  title: string;
  year: number | null;
  type: "movie" | "show";
  genres: string[];
  posterUrl: string | null;
  onNetflix: boolean;
  onPrime: boolean;
}

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
    package: { technicalName: string };
  }>;
}

interface JWPage {
  edges: Array<{ node: JWNode }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

const TITLES_QUERY = `
  query GetTitles($country: Country!, $language: Language!, $first: Int!, $after: String, $packages: [String!]) {
    popularTitles(
      country: $country
      first: $first
      after: $after
      filter: { packages: $packages }
    ) {
      edges {
        node {
          id
          objectType
          content(country: $country, language: $language) {
            title
            originalReleaseYear
            posterUrl(profile: S166)
            genres {
              translation(language: $language)
            }
            externalIds {
              imdbId
            }
          }
          offers(country: $country, platform: WEB) {
            package {
              technicalName
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

async function fetchPage(
  providers: string[],
  cursor: string | null
): Promise<JWPage> {
  const res = await fetch(JUSTWATCH_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: TITLES_QUERY,
      variables: {
        country: COUNTRY,
        language: LANGUAGE,
        first: 100,
        after: cursor ?? undefined,
        packages: providers,
      },
    }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`JustWatch API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`JustWatch GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data.popularTitles as JWPage;
}

function mapNode(
  node: JWNode,
  onNetflix: boolean,
  onPrime: boolean
): JWTitle {
  const providerNames = node.offers.map((o) => o.package.technicalName);
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
    onNetflix: onNetflix || providerNames.includes("netflix"),
    onPrime: onPrime || providerNames.includes("amazonprimevideo"),
  };
}

export async function fetchAllTitles(): Promise<JWTitle[]> {
  const titleMap = new Map<string, JWTitle>();

  for (const { provider, flag } of [
    { provider: "netflix", flag: "netflix" as const },
    { provider: "amazonprimevideo", flag: "prime" as const },
  ]) {
    let cursor: string | null = null;
    let hasNext = true;
    let pageCount = 0;

    while (hasNext && pageCount < 50) {
      const page = await fetchPage([provider], cursor);

      for (const { node } of page.edges) {
        const existing = titleMap.get(node.id);
        const isNetflix = flag === "netflix";
        const isPrime = flag === "prime";

        if (existing) {
          if (isNetflix) existing.onNetflix = true;
          if (isPrime) existing.onPrime = true;
        } else {
          titleMap.set(
            node.id,
            mapNode(node, isNetflix, isPrime)
          );
        }
      }

      hasNext = page.pageInfo.hasNextPage;
      cursor = page.pageInfo.endCursor;
      pageCount++;

      // Avoid hammering the API
      if (hasNext) await new Promise((r) => setTimeout(r, 100));
    }
  }

  return Array.from(titleMap.values());
}
