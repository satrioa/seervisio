const GOOGLE_DRIVE_FILE_RE = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;

export function toDirectImageUrl(url: string | null): string | null {
  if (!url) return null;

  const match = url.match(GOOGLE_DRIVE_FILE_RE);
  if (match) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }

  return url;
}
