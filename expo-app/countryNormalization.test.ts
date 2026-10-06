import test from "node:test";
import assert from "node:assert/strict";
import countries from "./countries.json";
import data from "./country-data.json";
import { normalizeCountry } from "./countryNormalization";

test("every existing canonical country remains selectable without a data migration", () => {
  for (const country of countries)
    assert.equal(normalizeCountry(country), country);
});

test("all bundled alpha-2/alpha-3 codes and source names resolve to the UI's canonical labels", () => {
  const alpha2 = new Set<string>();
  const alpha3 = new Set<string>();
  for (const row of data) {
    assert.ok(countries.includes(row.name));
    assert.ok(!alpha2.has(row.alpha2), `Duplicate alpha-2: ${row.alpha2}`);
    alpha2.add(row.alpha2);
    if (row.alpha3) {
      assert.ok(!alpha3.has(row.alpha3), `Duplicate alpha-3: ${row.alpha3}`);
      alpha3.add(row.alpha3);
    }
    for (const value of [row.alpha2, row.alpha3, ...row.aliases].filter(
      Boolean,
    )) {
      assert.equal(normalizeCountry(value), row.name, value);
    }
  }
  assert.ok(
    alpha2.size >= 249,
    "Whole country table, not a single-country patch",
  );
});

test("common, official and alternative passport country labels are normalized", () => {
  const examples: [string, string][] = [
    ["KG", "Kyrgyzstan"],
    ["KGZ", "Kyrgyzstan"],
    ["Kyrgyz Republic", "Kyrgyzstan"],
    ["  kyrgyzstan  ", "Kyrgyzstan"],
    ["United States of America", "United States"],
    ["Russian Federation", "Russia"],
    ["People's Republic of China", "China mainland"],
    ["Republic of Korea", "South Korea"],
    ["Korea, Democratic People's Republic of", "North Korea"],
    ["Republic of the Congo", "Congo - Brazzaville"],
    ["Democratic Republic of the Congo", "Congo - Kinshasa"],
    ["Cote d'Ivoire", "Côte d’Ivoire"],
    ["Ivory Coast", "Côte d’Ivoire"],
    ["Turkey", "Türkiye"],
    ["Cabo Verde", "Cape Verde"],
    ["Iran (Islamic Republic of)", "Iran"],
    ["Viet Nam", "Vietnam"],
    ["Micronesia (Federated States of)", "Micronesia"],
    ["United Republic of Tanzania", "Tanzania"],
    ["Holy See", "Vatican City"],
    ["Saint Vincent and the Grenadines", "St. Vincent & Grenadines"],
  ];
  for (const [input, expected] of examples)
    assert.equal(normalizeCountry(input), expected, input);
});

test("ICAO alternatives map safely, while unsupported and ambiguous values stay unselected", () => {
  for (const input of ["D", "D<<", "DE", "DEU"])
    assert.equal(normalizeCountry(input), "Germany");
  for (const input of ["KS", "XK", "RKS", "XKS"])
    assert.equal(normalizeCountry(input), "Kosovo");
  for (const input of ["GBD", "GBN", "GBO", "GBP", "GBS"])
    assert.equal(normalizeCountry(input), "United Kingdom");
  for (const input of [
    "",
    "UTO",
    "XXX",
    "XXA",
    "XXB",
    "XXC",
    "UNO",
    "EUE",
    "SUN",
    "YUG",
    "Congo",
    "Korea",
    "Guine",
    "Kirgiz",
    "K6Z",
    "KGZ Canada",
  ]) {
    assert.equal(normalizeCountry(input), null, input);
  }
  assert.equal(normalizeCountry(null), null);
  assert.equal(normalizeCountry(undefined), null);
});
