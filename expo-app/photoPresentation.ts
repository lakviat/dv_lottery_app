import { Person, Photo, photoRecent, photoReviewed, selectedPhotoForPerson } from "./models";
import { photoCheckSummary } from "./photoChecks";

export function photoStatus(photo?: Photo, now = new Date()) {
  if (!photo) return { label: "Photo needed", tone: "warm" as const };
  if (!photoRecent(photo, now))
    return { label: "New photo needed", tone: "warm" as const };
  const summary = photoCheckSummary(photo.analysis);
  if (summary.tone !== "green")
    return { label: summary.label, tone: summary.tone };
  if (photoReviewed(photo, now))
    return { label: summary.label, tone: summary.tone };
  return {
    label: "Confirm photo details",
    tone: "warm" as const,
  };
}

export function photoForPerson(person: Person, photos: Photo[]) {
  return selectedPhotoForPerson(person, photos);
}
