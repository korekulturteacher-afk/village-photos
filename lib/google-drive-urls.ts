/**
 * Google Drive Direct Link Utilities
 *
 * These functions generate direct links to Google Drive files
 * without requiring API authentication or serverless functions.
 *
 * Requirements:
 * - Files must be shared with "Anyone with the link"
 * - File IDs must be valid Google Drive file IDs
 */

/**
 * Generate direct view link for Google Drive file
 * Fast loading, no API required, no timeout issues
 */
export function getGoogleDriveDirectLink(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Generate thumbnail link for Google Drive file
 * Google automatically generates optimized thumbnails
 *
 * @param fileId - Google Drive file ID
 * @param size - Thumbnail width in pixels (default: 400)
 */
export function getGoogleDriveThumbnailLink(fileId: string, size: number = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

/**
 * Generate download link for Google Drive file
 * Forces browser to download instead of displaying
 */
export function getGoogleDriveDownloadLink(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Check if a file ID is valid Google Drive format
 */
export function isValidGoogleDriveFileId(fileId: string): boolean {
  // Google Drive file IDs are typically 25-40 characters
  // Contains alphanumeric characters, hyphens, and underscores
  return /^[a-zA-Z0-9_-]{25,50}$/.test(fileId);
}

/**
 * Get fallback API URL if direct link fails
 * Uses Next.js API route as backup
 */
export function getApiFallbackUrl(fileId: string, type: 'thumbnail' | 'image'): string {
  return `/api/${type}/${fileId}`;
}
