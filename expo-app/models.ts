export type Tab = "Home" | "Apply" | "Photos" | "My Entries";
export type Person = {
  id: string;
  first: string;
  middle: string;
  last: string;
  noFirst: boolean;
  noLast: boolean;
  dob: string;
  sex: string;
  city: string;
  country: string;
  relationship: "Primary" | "Spouse" | "Child";
};
export type Draft = {
  started: boolean;
  step: number;
  people: Person[];
  eligibilityCountry: string;
  eligibilityBasis: string;
  qualification: string;
  eligibilityReviewed: boolean;
  education: string;
  passportPlan: string;
  passportReviewed: boolean;
  email: string;
  phone: string;
  careOf: string;
  address: string;
  address2: string;
  city: string;
  province: string;
  postal: string;
  noPostal: boolean;
  country: string;
  residence: string;
  marital: string;
  familyReviewed: boolean;
  reviewed: boolean;
};
export type Photo = {
  id: string;
  personId: string;
  name: string;
  uri: string;
  takenOn: string;
  bytes: number;
  composition: boolean;
  notReused: boolean;
};
export const statuses = [
  "Entry submitted",
  "Not selected",
  "Selected",
  "DS-260 submitted",
  "Interview scheduled",
  "Visa issued",
  "Visa refused",
] as const;
export type EntryStatus = (typeof statuses)[number];
export type Entry = {
  id: string;
  year: string;
  name: string;
  surname: string;
  birthYear: string;
  confirmation: string;
  caseNumber: string;
  submitted: string;
  events: { id: string; status: EntryStatus; date: string; note: string }[];
};
export type Records = {
  version: 1;
  draft: Draft;
  photos: Photo[];
  entries: Entry[];
};
export const steps = [
  "Eligibility",
  "Personal",
  "Contact",
  "Family",
  "Photos",
  "Review",
];
export const id = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export const today = () => dateString(new Date());
export const dateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const makePerson = (
  relationship: Person["relationship"] = "Primary",
): Person => ({
  id: id(),
  first: "",
  middle: "",
  last: "",
  noFirst: false,
  noLast: false,
  dob: "",
  sex: "",
  city: "",
  country: "",
  relationship,
});
export const makeDraft = (): Draft => ({
  started: false,
  step: 0,
  people: [makePerson()],
  eligibilityCountry: "",
  eligibilityBasis: "Country of birth",
  qualification: "",
  eligibilityReviewed: false,
  education: "",
  passportPlan: "",
  passportReviewed: false,
  email: "",
  phone: "",
  careOf: "",
  address: "",
  address2: "",
  city: "",
  province: "",
  postal: "",
  noPostal: false,
  country: "",
  residence: "",
  marital: "",
  familyReviewed: false,
  reviewed: false,
});
export const makeRecords = (): Records => ({
  version: 1,
  draft: makeDraft(),
  photos: [],
  entries: [],
});
export const personName = (p: Person) =>
  [p.noFirst ? "" : p.first.trim(), p.noLast ? "" : p.last.trim()]
    .filter(Boolean)
    .join(" ") ||
  (p.relationship === "Primary"
    ? "Primary applicant"
    : `Unnamed ${p.relationship.toLowerCase()}`);

export function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const value = new Date(y, m - 1, d);
  return value.getFullYear() === y &&
    value.getMonth() === m - 1 &&
    value.getDate() === d
    ? value
    : null;
}
export function validPastDate(value: string, now = new Date()) {
  const date = parseDate(value);
  return !!date && date.getFullYear() >= 1900 && date <= now;
}
export function photoRecent(photo: Photo, now = new Date()) {
  const taken = parseDate(photo.takenOn);
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const last = new Date(
    cutoff.getFullYear(),
    cutoff.getMonth() + 1,
    0,
  ).getDate();
  cutoff.setDate(Math.min(now.getDate(), last));
  return !!taken && taken >= cutoff && taken <= now;
}
export const photoReviewed = (photo: Photo, now = new Date()) =>
  photo.composition && photo.notReused && photoRecent(photo, now);
export function personComplete(p: Person) {
  return (
    (!!p.first.trim() || p.noFirst) &&
    (!!p.last.trim() || p.noLast) &&
    !(p.noFirst && p.noLast) &&
    validPastDate(p.dob) &&
    !!p.sex &&
    !!p.city.trim() &&
    !!p.country
  );
}
export const needsSpouse = (draft: Draft) =>
  draft.marital === "Married — spouse is not a U.S. citizen / LPR";
export function draftIssues(d: Draft, photos: Photo[], step: number): string[] {
  const errors: string[] = [];
  switch (step) {
    case 0:
      if (!d.eligibilityCountry)
        errors.push("Choose your country of eligibility.");
      if (!d.qualification)
        errors.push("Choose an education or work experience basis.");
      if (!d.eligibilityReviewed)
        errors.push("Review the official eligibility instructions.");
      break;
    case 1:
      if (!personComplete(d.people[0]))
        errors.push(
          "Complete your name, valid birth date, sex, and birthplace.",
        );
      if (!d.education) errors.push("Choose your highest level of education.");
      if (!d.passportPlan || !d.passportReviewed)
        errors.push("Review passport and page-scan requirements.");
      break;
    case 2:
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
        errors.push("Enter a valid email address.");
      if (
        [d.address, d.city, d.province, d.country, d.residence].some(
          (v) => !v.trim(),
        )
      )
        errors.push("Complete your mailing address and country of residence.");
      if (!d.postal.trim() && !d.noPostal)
        errors.push("Enter your postal code or select no postal code.");
      break;
    case 3: {
      if (!d.marital) errors.push("Choose your marital status.");
      const spouses = d.people.filter((p) => p.relationship === "Spouse");
      if (needsSpouse(d) && spouses.length !== 1)
        errors.push("Add one spouse record for this marital status.");
      if (!needsSpouse(d) && spouses.length)
        errors.push("Review the spouse record against your marital status.");
      if (d.people.slice(1).some((p) => !personComplete(p)))
        errors.push("Complete each family member’s details.");
      if (!d.familyReviewed)
        errors.push("Confirm you reviewed who must be included.");
      break;
    }
    case 4:
      d.people.forEach((p) => {
        if (
          !photos.some(
            (photo) => photo.personId === p.id && photoReviewed(photo),
          )
        )
          errors.push(`Add and review a recent photo for ${personName(p)}.`);
      });
      break;
    case 5:
      if (!d.reviewed)
        errors.push("Confirm you reviewed your preparation details.");
  }
  return errors;
}
export function entryError(
  e: Pick<
    Entry,
    "year" | "name" | "surname" | "birthYear" | "confirmation" | "submitted"
  >,
  entries: Entry[],
) {
  if (!e.name.trim() || !e.surname.trim())
    return "Enter the applicant name and last / family name.";
  if (
    !/^\d{4}$/.test(e.year) ||
    Number(e.year) < 2000 ||
    Number(e.year) > new Date().getFullYear() + 2
  )
    return "Enter a valid DV program year from the confirmation page.";
  if (
    !/^\d{4}$/.test(e.birthYear) ||
    Number(e.birthYear) < 1900 ||
    Number(e.birthYear) > new Date().getFullYear()
  )
    return "Enter a valid four-digit birth year.";
  if (
    !/^[0-9]{4}[A-Z0-9]{12}$/.test(e.confirmation) ||
    !e.confirmation.startsWith(e.year)
  )
    return `Use a 16-character confirmation starting with ${e.year}.`;
  if (!validPastDate(e.submitted))
    return "Enter a valid submission date in YYYY-MM-DD format, not in the future.";
  if (entries.some((x) => x.confirmation === e.confirmation))
    return "This confirmation number is already saved.";
  if (
    entries.some(
      (x) =>
        x.year === e.year &&
        x.birthYear === e.birthYear &&
        x.name.trim().toLowerCase() === e.name.trim().toLowerCase(),
    )
  )
    return "An entry for this person and program year is already saved. Review it instead of creating a duplicate.";
  return null;
}
export const official = {
  portal: "https://dvprogram.state.gov/",
  results: "https://dvprogram.state.gov/ESC/",
  instructions:
    "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-instructions.html",
  photos:
    "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html",
  dates:
    "https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html",
  bulletin:
    "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html",
  passport:
    "https://www.govinfo.gov/content/pkg/FR-2026-03-11/pdf/2026-04737.pdf",
  fees: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html",
  news: "https://travel.state.gov/content/travel/en/News/visas-news.html",
};
