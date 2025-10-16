import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Initialize Google Drive client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let driveClient: any = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json',
    scopes: SCOPES,
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

// Export drive client for direct use
export const drive = getDriveClient();

export interface Photo {
  id: string;
  name: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

/**
 * List all photos from multiple Google Drive folders
 */
export async function listPhotos(folderIds: string[]): Promise<Photo[]> {
  const drive = getDriveClient();
  const allPhotos: Photo[] = [];

  for (const folderId of folderIds) {
    try {
      let pageToken: string | undefined = undefined;

      do {
        const response: drive_v3.Schema$FileList = (await drive.files.list({
          q: `'${folderId}' in parents and (mimeType contains 'image/')`,
          fields:
            'nextPageToken, files(id, name, thumbnailLink, webContentLink, webViewLink, mimeType, size, createdTime, modifiedTime)',
          pageSize: 1000,
          pageToken,
        })).data;

        if (response.files) {
          // Filter and map to ensure required fields are present
          const validPhotos = response.files
            .filter((file): file is drive_v3.Schema$File & { id: string; name: string; mimeType: string; createdTime: string; modifiedTime: string } =>
              file.id !== null &&
              file.id !== undefined &&
              file.name !== null &&
              file.name !== undefined &&
              file.mimeType !== null &&
              file.mimeType !== undefined &&
              file.createdTime !== null &&
              file.createdTime !== undefined &&
              file.modifiedTime !== null &&
              file.modifiedTime !== undefined
            )
            .map((file): Photo => ({
              id: file.id,
              name: file.name,
              thumbnailLink: file.thumbnailLink || undefined,
              webContentLink: file.webContentLink || undefined,
              webViewLink: file.webViewLink || undefined,
              mimeType: file.mimeType,
              size: file.size || undefined,
              createdTime: file.createdTime,
              modifiedTime: file.modifiedTime,
            }));
          allPhotos.push(...validPhotos);
        }

        pageToken = response.nextPageToken || undefined;
      } while (pageToken);
    } catch (error) {
      console.error(`Error fetching photos from folder ${folderId}:`, error);
    }
  }

  return allPhotos;
}

/**
 * Get photo metadata by ID
 */
export async function getPhoto(fileId: string): Promise<Photo | null> {
  try {
    const drive = getDriveClient();

    const response = await drive.files.get({
      fileId,
      fields:
        'id, name, thumbnailLink, webContentLink, webViewLink, mimeType, size, createdTime, modifiedTime',
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching photo ${fileId}:`, error);
    return null;
  }
}

/**
 * Get direct download link for a photo
 */
export async function getDownloadLink(fileId: string): Promise<string | null> {
  try {
    const drive = getDriveClient();

    // Get file metadata
    const response = await drive.files.get({
      fileId,
      fields: 'webContentLink',
    });

    return response.data.webContentLink || null;
  } catch (error) {
    console.error(`Error getting download link for ${fileId}:`, error);
    return null;
  }
}

/**
 * Download photo file as buffer
 */
export async function downloadPhoto(
  fileId: string
): Promise<Buffer | null> {
  try {
    const drive = getDriveClient();

    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );

    // Handle different response types
    let buffer: Buffer;
    if (Buffer.isBuffer(response.data)) {
      buffer = response.data;
    } else if (response.data instanceof ArrayBuffer) {
      buffer = Buffer.from(response.data);
    } else if (typeof response.data === 'string') {
      // If it's base64 encoded
      buffer = Buffer.from(response.data, 'base64');
    } else {
      // Try to convert to buffer anyway
      buffer = Buffer.from(response.data);
    }

    return buffer;
  } catch (error) {
    console.error(`Error downloading photo ${fileId}:`, error);
    return null;
  }
}

/**
 * Download photo thumbnail as buffer (faster loading)
 */
export async function downloadThumbnail(
  fileId: string,
  size: number = 400
): Promise<Buffer | null> {
  try {
    const drive = getDriveClient();

    // Get thumbnail using Google Drive's built-in thumbnail generation
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'arraybuffer',
        params: {
          // Request smaller size for thumbnails
          acknowledgeAbuse: true,
        }
      }
    );

    // Handle different response types
    let buffer: Buffer;
    if (Buffer.isBuffer(response.data)) {
      buffer = response.data;
    } else if (response.data instanceof ArrayBuffer) {
      buffer = Buffer.from(response.data);
    } else {
      buffer = Buffer.from(response.data);
    }

    return buffer;
  } catch (error) {
    console.error(`Error downloading thumbnail ${fileId}:`, error);
    return null;
  }
}

/**
 * Get multiple photos metadata
 */
export async function getPhotos(fileIds: string[]): Promise<Photo[]> {
  const photos: Photo[] = [];

  for (const fileId of fileIds) {
    const photo = await getPhoto(fileId);
    if (photo) {
      photos.push(photo);
    }
  }

  return photos;
}
