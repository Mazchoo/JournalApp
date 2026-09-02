/** Return whether a file name has an mp4 extension. */
export function isVideoFile(fileName: string): boolean {
  const fileExtention = fileName.split('.').pop()!.toLowerCase();
  return fileExtention === 'mp4';
}

/** Return whether a file name has a supported image extension. */
export function isImageFile(fileName: string): boolean {
  const fileExtention = fileName.split('.').pop()!.toLowerCase();
  return ['jpg', 'jpeg', 'jfif', 'png'].includes(fileExtention);
}

/** Return whether a file name has a glb extension. */
export function isMeshFile(fileName: string): boolean {
  return fileName.split('.').pop()!.toLowerCase() === 'glb';
}
