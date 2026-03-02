#!/usr/bin/env node
// Fetches one page from JustWatch and prints the distinct monetizationType values
// seen for each provider, so we can verify RENT/BUY offer detection.
//
// Usage:
//   node scripts/inspect-offers.mjs [package]   (default: amazonprimevideo)
//   node scripts/inspect-offers.mjs --no-filter  (fetch without package filter)

const pkg = process.argv[2] === "--no-filter" ? null : (process.argv[2] ?? "amazonprimevideo");

const QUERY = `
  query GetTitles($country: Country!, $language: Language!, $first: Int!, $packages: [String!]) {
    popularTitles(country: $country, first: $first, filter: { packages: $packages }) {
      edges {
        node {
          id
          content(country: $country, language: $language) { title }
          offers(country: $country, platform: WEB) {
            monetizationType
            package { technicalName }
          }
        }
      }
    }
  }
`;

const res = await fetch("https://apis.justwatch.com/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: QUERY,
    variables: { country: "ZA", language: "en", first: 20, packages: pkg ? [pkg] : undefined },
  }),
});

const json = await res.json();
if (json.errors) { console.error(json.errors); process.exit(1); }

const edges = json.data.popularTitles.edges;
console.log(`Fetched ${edges.length} titles (package filter: ${pkg ?? "none"})\n`);

// Aggregate: provider → Set of monetizationTypes seen
const providerTypes = new Map();

for (const { node } of edges) {
  for (const offer of node.offers) {
    const name = offer.package.technicalName;
    if (!providerTypes.has(name)) providerTypes.set(name, new Set());
    providerTypes.get(name).add(offer.monetizationType);
  }
}

console.log("Provider → monetizationTypes seen:");
for (const [name, types] of [...providerTypes.entries()].sort()) {
  console.log(`  ${name}: ${[...types].join(", ")}`);
}

// Also print raw offers for first 3 titles
console.log("\nRaw offers for first 3 titles:");
for (const { node } of edges.slice(0, 3)) {
  console.log(`\n  ${node.content.title} (${node.id})`);
  for (const o of node.offers) {
    console.log(`    ${o.package.technicalName} — ${o.monetizationType}`);
  }
}
