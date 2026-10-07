import { Entry, validPastDate } from "./models";

export type EntryInput = Pick<
  Entry,
  "name" | "surname" | "birthYear" | "year" | "confirmation" | "submitted"
>;
export type EntryFieldErrors = Partial<
  Record<keyof EntryInput | "attested", string>
>;

// Field-level presentation of the existing entry rules. entryError remains the
// final save guard so this UI layer cannot weaken business validation.
export function entryFieldErrors(
  input: EntryInput,
  entries: Entry[],
  attested: boolean,
  now = new Date(),
): EntryFieldErrors {
  const errors: EntryFieldErrors = {};
  if (!input.name.trim()) errors.name = "Enter the applicant’s full name.";
  if (!input.surname.trim())
    errors.surname = "Enter the last / family name from the confirmation page.";
  if (
    !/^\d{4}$/.test(input.birthYear) ||
    Number(input.birthYear) < 1900 ||
    Number(input.birthYear) > now.getFullYear()
  )
    errors.birthYear = "Enter a valid four-digit birth year.";
  if (
    !/^\d{4}$/.test(input.year) ||
    Number(input.year) < 2000 ||
    Number(input.year) > now.getFullYear() + 2
  )
    errors.year = "Enter the DV program year shown on your confirmation.";
  const confirmation = input.confirmation.trim().toUpperCase();
  if (
    !/^[0-9]{4}[A-Z0-9]{12}$/.test(confirmation) ||
    !confirmation.startsWith(input.year)
  )
    errors.confirmation =
      input.year && !errors.year
        ? `Enter a 16-character confirmation beginning with ${input.year}.`
        : "Enter the 16-character confirmation from the official portal.";
  if (!validPastDate(input.submitted, now))
    errors.submitted =
      "Enter a real submission date as YYYY-MM-DD, not a future date.";
  if (entries.some((entry) => entry.confirmation === confirmation))
    errors.confirmation =
      "This confirmation is already saved. Open its existing record.";
  if (
    entries.some(
      (entry) =>
        entry.year === input.year &&
        entry.birthYear === input.birthYear &&
        entry.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
    )
  )
    errors.year =
      "An entry for this person and program year is already saved. Open its existing record.";
  if (!attested)
    errors.attested =
      "Confirm this entry has already been submitted on the official portal.";
  const ordered: EntryFieldErrors = {};
  for (const key of [
    "name", "surname", "birthYear", "year", "confirmation", "submitted", "attested",
  ] as const) {
    if (errors[key]) ordered[key] = errors[key];
  }
  return ordered;
}

export function timelineFieldErrors(
  date: string,
  submitted: string,
  confirmed: boolean,
  now = new Date(),
): Record<string, string | undefined> {
  return {
    eventDate:
      !validPastDate(date, now) || date < submitted
        ? "Enter a date on or after submission, not in the future (YYYY-MM-DD)."
        : undefined,
    checked: !confirmed
      ? "Confirm this is your own recorded update."
      : undefined,
  };
}
