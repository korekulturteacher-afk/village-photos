#!/usr/bin/env node

import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';

const folderIds = process.argv.slice(2);

if (folderIds.length === 0) {
  console.error('Usage: node scripts/test-drive.mjs <folderId> [folderId...]');
  process.exit(1);
}

const keyPath = path.resolve(process.cwd(), 'service-account.json');

if (!fs.existsSync(keyPath)) {
  console.error(`service-account.json not found at ${keyPath}`);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

async function list(folderId) {
  let pageToken;
  const files = [];

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/')`,
      fields:
        'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
      pageSize: 10,
      pageToken,
    });

    if (response.data.files?.length) {
      files.push(...response.data.files);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

(async () => {
  for (const folderId of folderIds) {
    try {
      const photos = await list(folderId);
      console.log(`Folder ${folderId}: ${photos.length} files`);
      photos.forEach((photo) => {
        console.log(`  - ${photo.name} (${photo.id})`);
      });
    } catch (error) {
      console.error(`Failed to list folder ${folderId}:`, error);
    }
  }
})();
