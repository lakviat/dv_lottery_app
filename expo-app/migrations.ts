import {
  Draft,
  Person,
  Records,
  makeDraft,
  normalizeBirthDate,
  photoRecent,
} from "./models";
import { canonicalPersonName } from "./names";
import type { PhotoCheckReport } from "./photoCheckTypes";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validPhotoReport(value: unknown): value is PhotoCheckReport {
  if (
    !isObject(value) ||
    value.version !== 1 ||
    typeof value.checkedAt !== "string" ||
    !Number.isFinite(Date.parse(value.checkedAt)) ||
    !Array.isArray(value.checks) ||
    !value.checks.every(
      (check) =>
        isObject(check) &&
        ["id", "label", "detail"].every((key) => typeof check[key] === "string") &&
        typeof check.kind === "string" &&
        ["technical", "heuristic", "manual"].includes(check.kind) &&
        typeof check.state === "string" &&
        ["pass", "attention", "unverified"].includes(check.state),
    )
  )
    return false;
  return (
    ["width", "height", "bytes"].every(
      (key) =>
        value[key] === undefined ||
        (typeof value[key] === "number" &&
          Number.isSafeInteger(value[key]) &&
          value[key] >= (key === "bytes" ? 0 : 1)),
    ) &&
    ["format", "error"].every(
      (key) => value[key] === undefined || typeof value[key] === "string",
    )
  );
}

// Keep the original storage key so upgrades find the user's existing draft.
export function migrateRecords(raw: unknown): Records {
  const data = raw as Omit<Records, "version"> & { version: number };
  if (
    !data ||
    ![1, 2, 3].includes(data.version) ||
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
  const legacy = data.version < 3;
  const section: Draft["detailsSection"] = old
    ? data.draft.step === 2
      ? "contact"
      : data.draft.step === 3
        ? "family"
        : "personal"
    : data.draft.detailsSection;
  if (!["personal", "contact", "family"].includes(section))
    throw new Error("Saved form section is invalid.");
  if (
    data.draft.people.some(
      (person) =>
        !person ||
        ["id", "first", "middle", "last", "dob"].some(
          (key) => typeof person[key as keyof Person] !== "string",
        ),
    ) ||
    data.photos.some(
      (photo) =>
        !photo ||
        typeof photo.id !== "string" ||
        typeof photo.personId !== "string" ||
        typeof photo.takenOn !== "string" ||
        typeof photo.uri !== "string" ||
        !photo.uri.trim() ||
        (photo.sourceUri !== undefined &&
          (typeof photo.sourceUri !== "string" || !photo.sourceUri.trim())) ||
        (photo.analysis !== undefined && !validPhotoReport(photo.analysis)),
    )
  )
    throw new Error(
      "Saved people or photos have an invalid format. Existing records have not been overwritten.",
    );
  const photos = data.photos.map((photo) => ({
    ...photo,
    notAltered: !legacy && photo.notAltered === true,
  }));
  return {
    ...data,
    version: 3,
    photos,
    draft: {
      ...makeDraft(),
      ...data.draft,
      step: old
        ? data.draft.step >= 4
          ? data.draft.step - 3
          : 0
        : data.draft.step,
      detailsSection: section,
      people: data.draft.people.map((p) => {
        const { noFirst, noLast, ...person } = p as Person & {
          noFirst?: boolean;
          noLast?: boolean;
        };
        const name = canonicalPersonName(person);
        const moveName = legacy && noLast && !person.last.trim();
        const assigned = legacy
          ? data.photos.filter((photo) => photo.personId === person.id)
          : [];
        // Only legacy records inherit the formerly displayed photo, before the
        // new alteration attestation. Current records never guess a selection.
        const preferred =
          assigned.find(
            (photo) => photo.composition && photo.notReused && photoRecent(photo),
          ) ?? assigned[0];
        return {
          ...person,
          ...(moveName ? name : {}),
          oneLegalName: legacy
            ? moveName
              ? name.oneLegalName
              : !!noFirst && name.oneLegalName
            : person.oneLegalName === true,
          selectedPhotoId: legacy
            ? preferred?.id ?? ""
            : typeof person.selectedPhotoId === "string"
              ? person.selectedPhotoId
              : "",
          dob: normalizeBirthDate(person.dob),
        };
      }),
    },
  };
}
