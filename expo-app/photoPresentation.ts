import { Photo, photoRecent, photoReviewed } from "./models";

export function photoStatus(photo?: Photo, now = new Date()) {
  if (!photo) return { label: "Photo needed", tone: "warm" as const };
  if (photoReviewed(photo, now))
    return { label: "Reviewed by you", tone: "green" as const };
  return {
    label: photoRecent(photo, now) ? "Needs review" : "New photo needed",
    tone: "warm" as const,
  };
}

export function photoForPerson(photos: Photo[], personId: string, now = new Date()) {
  const assigned = photos.filter((photo) => photo.personId === personId);
  return assigned.find((photo) => photoReviewed(photo, now)) ?? assigned[0];
}
