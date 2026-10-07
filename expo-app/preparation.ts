import {
  Draft,
  Photo,
  Records,
  detailsIssues,
  draftIssues,
  needsSpouse,
  personErrors,
  photoReviewed,
  personName,
  steps,
} from "./models";

export type FieldErrors = Record<string, string>;
export const personFieldID = (personID: string, field: string) =>
  `person-${personID}-${field}`;

/** Same requirements as the existing checklist, attached to visible controls. */
export function detailsFieldErrors(
  d: Draft,
  section: Draft["detailsSection"],
): FieldErrors {
  const errors: FieldErrors = {};
  const addPerson = (person: Draft["people"][number]) => {
    for (const [key, value] of Object.entries(personErrors(person)))
      if (value) errors[personFieldID(person.id, key)] = value;
  };
  if (section === "personal") {
    addPerson(d.people[0]);
    if (!d.education)
      errors.education = "Please select your highest level of education.";
  } else if (section === "contact") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
      errors.email = "Enter a valid email address.";
    for (const [key, message] of [
      ["address", "Enter your street address."],
      ["city", "Enter your city or town."],
      ["province", "Enter your district, province or state."],
    ] as const)
      if (!d[key].trim()) errors[key] = message;
    if (!d.postal.trim() && !d.noPostal)
      errors.postal = "Enter a postal code or choose no postal code.";
    if (!d.country.trim()) errors.country = "Choose your mailing country.";
    if (!d.residence.trim()) errors.residence = "Choose the country where you live.";
  } else {
    if (!d.marital) errors.marital = "Choose your current marital status.";
    const spouses = d.people.filter((p) => p.relationship === "Spouse");
    if (!needsSpouse(d) && spouses.length)
      errors.marital = "Review the spouse record against your marital status.";
    d.people.slice(1).forEach(addPerson);
    if (needsSpouse(d) && spouses.length !== 1)
      errors.familyMembers = "Add one spouse record for this marital status.";
    if (!d.familyReviewed)
      errors.familyReviewed = "Confirm you reviewed who must be included.";
  }
  return errors;
}

export function reviewFieldErrors(d: Draft): FieldErrors {
  const errors: FieldErrors = {};
  if (!d.eligibilityCountry)
    errors.eligibilityCountry = "Choose your country of eligibility.";
  if (
    !d.qualification ||
    d.qualification === "I need to review the requirements"
  )
    errors.qualification =
      "Review and choose your education or work experience basis.";
  if (!d.eligibilityReviewed)
    errors.eligibilityReviewed =
      "Confirm you reviewed the official eligibility rules.";
  if (!d.passportPlan)
    errors.passportPlan = "Choose your passport preparation status.";
  if (!d.passportReviewed)
    errors.passportReviewed =
      "Confirm you reviewed the passport and scan requirements.";
  if (!d.reviewed)
    errors.reviewed = "Confirm you reviewed your preparation details.";
  return errors;
}

export function photoFieldErrors(d: Draft, photos: Photo[]): FieldErrors {
  return Object.fromEntries(
    d.people
      .filter(
        (p) =>
          !photos.some(
            (photo) => photo.personId === p.id && photoReviewed(photo),
          ),
      )
      .map((p) => [
        `photo-${p.id}`,
        `Add and review a recent photo for ${personName(p)}.`,
      ]),
  );
}

export function preparationProgress(records: Records) {
  const { draft, photos } = records;
  const completed = steps.map((_, i) => !draftIssues(draft, photos, i).length);
  const next = completed.findIndex((done) => !done);
  const step = next === -1 ? 2 : next;
  const section =
    (["personal", "contact", "family"] as const).find(
      (part) => detailsIssues(draft, part).length,
    ) ?? "personal";
  return {
    completed,
    count: completed.filter(Boolean).length,
    ready: next === -1,
    step,
    section,
    action:
      next === -1
        ? "View your reviewed entry"
        : step === 1
          ? "Add your photo"
          : step === 2
            ? "Review your entry"
            : section === "personal"
              ? draft.started
                ? "Continue personal details"
                : "Start preparing"
              : section === "contact"
                ? "Complete contact details"
                : "Complete family details",
  };
}

/** Presentation options follow existing spouse/child rules; adding types is data-driven. */
export function familyAddOptions(
  d: Draft,
): { relationship: "Spouse" | "Child"; label: string }[] {
  const choices: {
    relationship: "Spouse" | "Child";
    label: string;
    available: boolean;
  }[] = [
    {
      relationship: "Spouse",
      label: "Add spouse",
      available:
        needsSpouse(d) && !d.people.some((p) => p.relationship === "Spouse"),
    },
    { relationship: "Child", label: "Add child", available: true },
  ];
  return choices.filter((choice) => choice.available);
}
