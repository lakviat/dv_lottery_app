import countries from "./countries.json";
import countryData from "./country-data.json";

// Bundled data, never a network lookup and never a guess from nationality to
// birthplace. Codes/common names: Unicode CLDR supplementalData.xml + en.xml;
// official UN names/code cross-check: unstats.un.org/unsd/methodology/m49/overview/.
// Source snapshot: 2026-10-06. See country-data.LICENSE.txt for the CLDR license.
// ICAO exceptions: Doc 9303 Part 3, section 5 (icao.int/publications/doc-series/doc-9303).
const aliases: Record<string, string[]> = {
  Kyrgyzstan: ["Kyrgyz Republic", "Republic of Kyrgyzstan", "Kirgizstan"],
  Germany: ["D", "D<<", "Federal Republic of Germany", "Deutschland"],
  Kosovo: ["KS", "RKS", "XKS", "Republic of Kosovo"],
  "United Kingdom": [
    "GBD",
    "GBN",
    "GBO",
    "GBP",
    "GBS",
    "Great Britain",
    "United Kingdom of Great Britain and Northern Ireland",
  ],
  "United States": ["United States of America"],
  Russia: ["Russian Federation"],
  "China mainland": ["People's Republic of China", "PR China"],
  Taiwan: ["Republic of China", "Taiwan, Province of China"],
  "South Korea": ["Republic of Korea", "Korea, Republic of"],
  "North Korea": [
    "Democratic People's Republic of Korea",
    "Korea, Democratic People's Republic of",
  ],
  "Congo - Brazzaville": [
    "Republic of the Congo",
    "Republic of Congo",
    "Congo Republic",
  ],
  "Congo - Kinshasa": [
    "Democratic Republic of Congo",
    "Congo, Democratic Republic of the",
    "DR Congo",
    "DRC",
  ],
  Iran: ["Islamic Republic of Iran", "Iran, Islamic Republic of"],
  Laos: ["Lao People's Democratic Republic", "Lao PDR"],
  Moldova: ["Republic of Moldova", "Moldova, Republic of"],
  Tanzania: ["United Republic of Tanzania", "Tanzania, United Republic of"],
  Bolivia: [
    "Plurinational State of Bolivia",
    "Bolivia, Plurinational State of",
  ],
  Venezuela: [
    "Bolivarian Republic of Venezuela",
    "Venezuela, Bolivarian Republic of",
  ],
  Micronesia: [
    "Federated States of Micronesia",
    "Micronesia, Federated States of",
  ],
  "Palestinian Territories": ["State of Palestine", "Palestine, State of"],
  "Côte d’Ivoire": ["Ivory Coast", "Republic of Cote d'Ivoire"],
  "Myanmar (Burma)": ["Myanmar", "Burma", "Republic of the Union of Myanmar"],
  Türkiye: ["Turkey", "Republic of Turkey", "Republic of Türkiye"],
  Czechia: ["Czech Republic"],
  "Cape Verde": ["Cabo Verde", "Republic of Cabo Verde"],
  "North Macedonia": [
    "Republic of North Macedonia",
    "Macedonia",
    "The former Yugoslav Republic of Macedonia",
  ],
  Eswatini: ["Swaziland", "Kingdom of Eswatini"],
  Brunei: ["Brunei Darussalam"],
  Vietnam: ["Viet Nam", "Socialist Republic of Viet Nam"],
  Syria: ["Syrian Arab Republic"],
  "Timor-Leste": ["East Timor", "Democratic Republic of Timor-Leste"],
  "Vatican City": ["Holy See", "Holy See (Vatican City State)"],
  "United Arab Emirates": ["UAE"],
  "South Africa": ["Republic of South Africa"],
  Egypt: ["Arab Republic of Egypt"],
  India: ["Republic of India", "Bharat"],
  Pakistan: ["Islamic Republic of Pakistan"],
  Bangladesh: ["People's Republic of Bangladesh"],
  Nepal: ["Federal Democratic Republic of Nepal"],
  "Sri Lanka": ["Democratic Socialist Republic of Sri Lanka"],
  Philippines: ["Republic of the Philippines"],
  Brazil: ["Federative Republic of Brazil"],
  Mexico: ["United Mexican States"],
  Argentina: ["Argentine Republic"],
  "Hong Kong": ["Hong Kong Special Administrative Region", "Hong Kong SAR"],
  Macao: ["Macau", "Macao Special Administrative Region", "Macau SAR"],
};

function key(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s.,'’()\-<]/g, "");
}

// A collision deliberately becomes unresolved instead of last-write-wins.
const lookup = new Map<string, string | null>();
function add(value: string, country: string) {
  if (!value) return;
  const normalized = key(value);
  if (lookup.has(normalized) && lookup.get(normalized) !== country)
    lookup.set(normalized, null);
  else lookup.set(normalized, country);
}
countries.forEach((country) => add(country, country));
countryData.forEach(({ name, alpha2, alpha3, aliases: names }) => {
  [alpha2, alpha3, ...names].forEach((value) => add(value, name));
});
Object.entries(aliases).forEach(([country, names]) => {
  if (!countries.includes(country))
    throw new Error(`Unknown canonical country: ${country}`);
  names.forEach((value) => add(value, country));
});

/** Exact normalized matches only. Unknown, ambiguous, historic unions,
 * international organizations and stateless/refugee codes stay unselected. */
export function normalizeCountry(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return lookup.get(key(value)) ?? null;
}
