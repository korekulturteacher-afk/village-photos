import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Initialize Google Drive client
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
        const response = await drive.files.list({
          q: `'${folderId}' in parents and (mimeType contains 'image/')`,
          fields:
            'nextPageToken, files(id, name, thumbnailLink, webContentLink, webViewLink, mimeType, size, createdTime, modifiedTime)',
          pageSize: 1000,
          pageToken,
        });

        if (response.data.files) {
          allPhotos.push(...response.data.files);
        }

        pageToken = response.data.nextPageToken || undefined;
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

    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Error downloading photo ${fileId}:`, error);
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
