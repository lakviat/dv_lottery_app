import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePassport } from "../expo-app/passport";

const lines = JSON.parse(readFileSync(process.argv[2], "utf8"));
assert.deepEqual(parsePassport(lines, "2026-10-05"), {
  first: "ANNA",
  middle: "MARIA",
  last: "ERIKSSON",
  dob: "1974-08-12",
  sex: "Female",
  number: "L898902C3",
  issuer: "UTO",
  nationality: "UTO",
  expires: "2012-04-15",
});
console.log(
  "PASS: Apple Vision image recognition → checked MRZ parsing → expected fictional passport details.",
);
