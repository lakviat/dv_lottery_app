type PhotoAssets = { uri: string; sourceUri?: string };
const ownedFileName = /^[a-z0-9]+-[a-z0-9]+(?:-source)?\.[a-z0-9]+$/i;

export function isOwnedPhotoURI(uri: string, directory: string) {
  return uri.startsWith(directory) && ownedFileName.test(uri.slice(directory.length));
}

export function ownedPhotoAssets(photo: PhotoAssets, directory: string): string[] {
  return [...new Set([photo.uri, photo.sourceUri]
    .filter((uri): uri is string => !!uri && isOwnedPhotoURI(uri, directory)))];
}

export function orphanPhotoURIs(directory: string, files: string[], photos: PhotoAssets[]) {
  const retained = new Set(photos.flatMap((photo) => [photo.uri, photo.sourceUri]));
  return files.map((file) => `${directory}${file}`)
    .filter((uri) => isOwnedPhotoURI(uri, directory) && !retained.has(uri));
}
