import { makeDraft, personName, type Records } from "./models";

function requirePhoto(records: Records, photoId: string) {
  const photo = records.photos.find((item) => item.id === photoId);
  if (!photoId || !photo) throw new Error("Photo not found in your library.");
  return photo;
}

function clearSelectedPhoto(draft: Records["draft"], photoId: string) {
  if (!draft.people.some((person) => person.selectedPhotoId === photoId))
    return draft;
  return {
    ...draft,
    reviewed: false,
    people: draft.people.map((person) =>
      person.selectedPhotoId === photoId
        ? { ...person, selectedPhotoId: "" }
        : person,
    ),
  };
}

export function selectPhoto(records: Records, photoId: string): Records {
  const photo = requirePhoto(records, photoId);
  const person = records.draft.people.find(
    (item) => item.id === photo.personId,
  );
  if (!photo.personId || !person)
    throw new Error("Assign this photo to an existing person before selecting it.");
  if (person.selectedPhotoId === photoId) return records;
  return {
    ...records,
    draft: {
      ...records.draft,
      reviewed: false,
      people: records.draft.people.map((item) =>
        item.id === person.id ? { ...item, selectedPhotoId: photoId } : item,
      ),
    },
  };
}

export function deletePhoto(records: Records, photoId: string): Records {
  requirePhoto(records, photoId);
  return {
    ...records,
    draft: clearSelectedPhoto(records.draft, photoId),
    photos: records.photos.filter((photo) => photo.id !== photoId),
  };
}

export function reassignPhoto(
  records: Records,
  photoId: string,
  personId: string,
): Records {
  const photo = requirePhoto(records, photoId);
  const recipient = records.draft.people.find((person) => person.id === personId);
  // An empty person ID returns the photo to the unassigned library.
  if (personId && !recipient)
    throw new Error("Choose an existing person to assign this photo.");
  return {
    ...records,
    draft: photo.personId !== personId
      ? clearSelectedPhoto(records.draft, photoId)
      : records.draft,
    photos: records.photos.map((item) =>
      item.id === photoId
        ? { ...item, personId, name: recipient ? personName(recipient) : item.name }
        : item,
    ),
  };
}

export function resetPreparation(records: Records): Records {
  return {
    ...records,
    draft: makeDraft(),
    photos: records.photos.map((photo) => ({ ...photo, personId: "" })),
  };
}
