import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3';
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface DriveFile {
  id?: string | null;
  name?: string | null;
  thumbnailLink?: string | null;
  webContentLink?: string | null;
  webViewLink?: string | null;
  mimeType?: string | null;
  size?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
}

interface DriveFileListResponse {
  nextPageToken?: string | null;
  files?: DriveFile[] | null;
}

let cachedCredentials: ServiceAccountCredentials | null = null;
let tokenCache: TokenCache | null = null;
let tokenPromise: Promise<string> | null = null;

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

function base64UrlEncode(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function readCredentialFromEnv(): ServiceAccountCredentials | null {
  const envCredential =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ??
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ??
    process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;

  if (!envCredential) {
    return null;
  }

  try {
    const rawJson =
      envCredential.trim().startsWith('{')
        ? envCredential
        : Buffer.from(envCredential, 'base64').toString('utf8');

    const parsed = JSON.parse(rawJson) as {
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.client_email || !parsed.private_key) {
      console.warn(
        '[Google Drive] Missing client_email or private_key in provided service account credentials.'
      );
      return null;
    }

    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    };
  } catch (error) {
    console.error('[Google Drive] Failed to parse GOOGLE_SERVICE_ACCOUNT_* credentials:', error);
    return null;
  }
}

function readCredentialFromFile(): ServiceAccountCredentials | null {
  const keyFilePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ??
    path.join(process.cwd(), 'service-account.json');

  try {
    const fileContents = readFileSync(keyFilePath, 'utf8');
    const parsed = JSON.parse(fileContents) as {
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.client_email || !parsed.private_key) {
      console.warn(
        `[Google Drive] service-account.json is missing client_email or private_key: ${keyFilePath}`
      );
      return null;
    }

    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    };
  } catch (error) {
    console.warn('[Google Drive] Unable to read service-account.json file:', error);
    return null;
  }
}

function resolveServiceAccountCredentials(): ServiceAccountCredentials | null {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const fromEnv = readCredentialFromEnv();
  if (fromEnv) {
    cachedCredentials = fromEnv;
    return cachedCredentials;
  }

  const fromFile = readCredentialFromFile();
  if (fromFile) {
    cachedCredentials = fromFile;
    return cachedCredentials;
  }

  console.error(
    '[Google Drive] Service account credentials are not configured. Provide GOOGLE_SERVICE_ACCOUNT_* environment variables or service-account.json.'
  );
  return null;
}

function ensureCredentials(): ServiceAccountCredentials {
  const credentials = resolveServiceAccountCredentials();
  if (!credentials) {
    throw new Error('Google Drive credentials are not available.');
  }
  return credentials;
}

function createJwtAssertion(credentials: ServiceAccountCredentials): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: credentials.clientEmail,
    scope: SCOPES.join(' '),
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(credentials.privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

async function fetchAccessToken(): Promise<string> {
  const credentials = ensureCredentials();
  const assertion = createJwtAssertion(credentials);

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[Google Drive] Failed to fetch access token (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const expiresIn = json.expires_in ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn - 60;

  tokenCache = {
    accessToken: json.access_token,
    expiresAt,
  };

  return json.access_token;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (tokenCache && tokenCache.accessToken && tokenCache.expiresAt > now) {
    return tokenCache.accessToken;
  }

  if (!tokenPromise) {
    tokenPromise = fetchAccessToken().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
}

type DriveQuery = Record<string, string | number | boolean | undefined>;

function buildDriveUrl(pathname: string, query: DriveQuery = {}): URL {
  const url = new URL(
    pathname.startsWith('http')
      ? pathname
      : `${DRIVE_BASE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
  );

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url;
}

async function driveFetch(
  pathname: string,
  query: DriveQuery = {},
  init: RequestInit = {}
): Promise<Response> {
  const url = buildDriveUrl(pathname, query);
  const token = await getAccessToken();

  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const finalInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(url, finalInit);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[Google Drive] API request failed (${response.status} ${response.statusText}) for ${url.toString()}: ${errorText}`
      );
    }

    return response;
  } catch (error) {
    console.error('[Google Drive] Request failed:', error);
    throw error;
  }
}

async function driveJson<T>(
  pathname: string,
  query: DriveQuery = {},
  init: RequestInit = {}
): Promise<T> {
  const response = await driveFetch(pathname, query, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...Object.fromEntries(new Headers(init.headers ?? {})),
    },
  });

  return (await response.json()) as T;
}

async function driveDownload(
  pathname: string,
  query: DriveQuery = {}
): Promise<Buffer> {
  const response = await driveFetch(pathname, query, {
    headers: {
      Accept: 'application/octet-stream',
    },
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function mapDriveFileToPhoto(file: DriveFile): Photo | null {
  if (
    !file ||
    !file.id ||
    !file.name ||
    !file.mimeType ||
    !file.createdTime ||
    !file.modifiedTime
  ) {
    return null;
  }

  return {
    id: file.id,
    name: file.name,
    thumbnailLink: file.thumbnailLink ?? undefined,
    webContentLink: file.webContentLink ?? undefined,
    webViewLink: file.webViewLink ?? undefined,
    mimeType: file.mimeType,
    size: file.size ?? undefined,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
  };
}

export async function listPhotos(folderIds: string[]): Promise<Photo[]> {
  const allPhotos: Photo[] = [];

  for (const folderId of folderIds) {
    try {
      let pageToken: string | undefined;

      do {
        const response = await driveJson<DriveFileListResponse>('/files', {
          q: `'${folderId}' in parents and (mimeType contains 'image/')`,
          fields:
            'nextPageToken, files(id, name, thumbnailLink, webContentLink, webViewLink, mimeType, size, createdTime, modifiedTime)',
          pageSize: 1000,
          pageToken,
          orderBy: 'createdTime desc',
        });

        if (response.files) {
          for (const file of response.files) {
            const photo = mapDriveFileToPhoto(file);
            if (photo) {
              allPhotos.push(photo);
            }
          }
        }

        pageToken = response.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (error) {
      console.error(`[Google Drive] Error listing photos for folder ${folderId}:`, error);
    }
  }

  return allPhotos;
}

export async function getPhoto(fileId: string): Promise<Photo | null> {
  try {
    const response = await driveJson<DriveFile>(`/files/${encodeURIComponent(fileId)}`, {
      fields:
        'id, name, thumbnailLink, webContentLink, webViewLink, mimeType, size, createdTime, modifiedTime',
    });

    const mapped = mapDriveFileToPhoto(response);

    if (!mapped) {
      console.warn(
        `[Google Drive] Incomplete metadata received for photo ${fileId}:`,
        response
      );
    }

    return mapped;
  } catch (error) {
    console.error(`Error fetching photo ${fileId}:`, error);
    return null;
  }
}

export async function getDownloadLink(fileId: string): Promise<string | null> {
  try {
    const response = await driveJson<DriveFile>(`/files/${encodeURIComponent(fileId)}`, {
      fields: 'webContentLink',
    });

    return response.webContentLink ?? null;
  } catch (error) {
    console.error(`Error getting download link for ${fileId}:`, error);
    return null;
  }
}

export async function downloadPhoto(fileId: string): Promise<Buffer | null> {
  try {
    return await driveDownload(`/files/${encodeURIComponent(fileId)}`, {
      alt: 'media',
      acknowledgeAbuse: true,
    });
  } catch (error) {
    console.error(`[Google Drive] Error downloading photo ${fileId}:`, error);
    return null;
  }
}

export async function downloadThumbnail(
  fileId: string,
  size: number = 400
): Promise<Buffer | null> {
  try {
    const metadata = await getPhoto(fileId);
    const thumbnailUrl = metadata?.thumbnailLink;

    if (thumbnailUrl) {
      try {
        const url = new URL(thumbnailUrl);

        if (size > 0) {
          url.searchParams.set('sz', `w${size}`);
        }

        const response = await fetch(url.toString());
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length > 0) {
            return buffer;
          }
        } else {
          console.warn(
            `[Google Drive] Thumbnail fetch failed for ${fileId} (${response.status})`
          );
        }
      } catch (error) {
        console.warn(`[Google Drive] Falling back to full download for ${fileId}:`, error);
      }
    }

    return await downloadPhoto(fileId);
  } catch (error) {
    console.error(`[Google Drive] Error downloading thumbnail ${fileId}:`, error);
    return null;
  }
}

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
