import config from "./config";

export const GENRES_QUERY = `
  query GetGenres {
    genres {
      shortName
      translation(language: ${config.language})
    }
  }
`;

export const TITLES_QUERY = `
  query GetTitles($country: Country!, $language: Language!, $first: Int!, $after: String, $packages: [String!], $genres: [String!]) {
    popularTitles(
      country: $country
      first: $first
      after: $after
      filter: { packages: $packages, genres: $genres }
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
            monetizationType
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
