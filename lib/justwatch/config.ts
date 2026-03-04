/**
 * Shared configuration for the JustWatch GraphQL API client.
 *
 * - country/language: South Africa catalog in English.
 * - providers: JustWatch package technical names for Netflix, Prime Video, and Apple TV+.
 *   Disney+ is excluded because JustWatch ZA does not track it.
 */
const config = {
  apiUrl: "https://apis.justwatch.com/graphql",
  country: "ZA",
  language: "en",
  providers: ["netflix", "amazonprimevideo", "appletvplus"],
} as const;

export default config;
