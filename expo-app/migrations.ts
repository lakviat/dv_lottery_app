import { Draft, Records, makeDraft, normalizeBirthDate } from "./models";

// Keep the original storage key so upgrades find the user's existing draft.
export function migrateRecords(raw: unknown): Records {
  const data = raw as Omit<Records, "version"> & { version: number };
  if (
    !data ||
    ![1, 2].includes(data.version) ||
    !data.draft ||
    !Array.isArray(data.draft.people) ||
    !data.draft.people.length ||
    !Array.isArray(data.entries) ||
    !Array.isArray(data.photos) ||
    !Number.isInteger(data.draft.step) ||
    data.draft.step < 0 ||
    data.draft.step > (data.version === 1 ? 5 : 2)
  ) {
    throw new Error(
      "Saved data has an unsupported format. Existing records have not been overwritten.",
    );
  }
  const old = data.version === 1;
  const section: Draft["detailsSection"] = old
    ? data.draft.step === 2
      ? "contact"
      : data.draft.step === 3
        ? "family"
        : "personal"
    : data.draft.detailsSection;
  if (!["personal", "contact", "family"].includes(section))
    throw new Error("Saved form section is invalid.");
  return {
    ...data,
    version: 2,
    draft: {
      ...makeDraft(),
      ...data.draft,
      step: old
        ? data.draft.step >= 4
          ? data.draft.step - 3
          : 0
        : data.draft.step,
      detailsSection: section,
      people: data.draft.people.map((p) => ({
        ...p,
        dob: normalizeBirthDate(p.dob),
      })),
    },
  };
}
