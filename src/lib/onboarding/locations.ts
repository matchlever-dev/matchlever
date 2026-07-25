export type CountryOption = {
  value: string;
  label: string;
};

/** Closest-city options keyed by country value. */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  "United States": [
    "Atlanta, GA",
    "Austin, TX",
    "Boston, MA",
    "Chicago, IL",
    "Dallas, TX",
    "Denver, CO",
    "Los Angeles, CA",
    "Miami, FL",
    "New York, NY",
    "Phoenix, AZ",
    "San Francisco, CA",
    "Seattle, WA",
    "Washington, DC",
  ],
  Canada: [
    "Calgary, AB",
    "Montreal, QC",
    "Ottawa, ON",
    "Toronto, ON",
    "Vancouver, BC",
  ],
  "United Kingdom": [
    "Birmingham",
    "Edinburgh",
    "London",
    "Manchester",
    "Remote UK",
  ],
  Germany: ["Berlin", "Hamburg", "Munich", "Frankfurt", "Cologne"],
  France: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"],
  Netherlands: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
  Ireland: ["Dublin", "Cork", "Galway"],
  India: ["Bengaluru", "Hyderabad", "Mumbai", "New Delhi", "Pune", "Chennai"],
  Singapore: ["Singapore"],
  Australia: ["Sydney", "Melbourne", "Brisbane", "Perth"],
  Brazil: ["São Paulo", "Rio de Janeiro", "Brasília"],
  Mexico: ["Mexico City", "Guadalajara", "Monterrey"],
  Japan: ["Tokyo", "Osaka", "Kyoto"],
  "South Korea": ["Seoul", "Busan"],
  Israel: ["Tel Aviv", "Jerusalem", "Haifa"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi"],
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  ...Object.keys(CITIES_BY_COUNTRY)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name })),
  { value: "Other", label: "Other / not listed" },
];

export const OTHER_CITY_VALUE = "__other__";

export function citiesForCountry(country: string): string[] {
  return CITIES_BY_COUNTRY[country] ?? [];
}
