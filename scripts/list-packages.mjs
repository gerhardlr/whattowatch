#!/usr/bin/env node
// Lists all JustWatch package technical names available in ZA

const QUERY = `
  query GetTitles($country: Country!, $first: Int!) {
    popularTitles(country: $country, first: $first) {
      edges {
        node {
          offers(country: $country, platform: WEB) {
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
    variables: { country: "ZA", first: 100 },
  }),
});

const json = await res.json();
if (json.errors) { console.error(json.errors); process.exit(1); }

const seen = new Set();
for (const { node } of json.data.popularTitles.edges) {
  for (const o of node.offers) {
    seen.add(o.package.technicalName);
  }
}

console.log("Package technical names (ZA):");
for (const k of [...seen].sort()) {
  console.log(`  ${k}`);
}
