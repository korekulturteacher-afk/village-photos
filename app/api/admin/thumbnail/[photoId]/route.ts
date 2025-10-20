import { NextRequest, NextResponse } from 'next/server';
import { auth, drive_v3 } from '@googleapis/drive';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;

    console.log('[Thumbnail API] Fetching thumbnail for:', photoId);

    // Decode base64 service account credentials
    const serviceAccountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccountBase64) {
      console.error('[Thumbnail API] Service account not configured');
      return NextResponse.json(
        { error: 'Service account not configured' },
        { status: 500 }
      );
    }

    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
    );

    // Initialize Google Drive API
    const authClient = new auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = new drive_v3.Drive({ auth: authClient });

    // Get file metadata including thumbnail link
    console.log('[Thumbnail API] Fetching file metadata for:', photoId);
    const file = await drive.files.get({
      fileId: photoId,
      fields: 'thumbnailLink,mimeType,name',
    });

    console.log('[Thumbnail API] File info:', {
      name: file.data.name,
      mimeType: file.data.mimeType,
      hasThumbnail: !!file.data.thumbnailLink,
    });

    // Use Google's thumbnail link if available
    if (file.data.thumbnailLink) {
      const thumbnailUrl = file.data.thumbnailLink.replace('=s220', '=s400'); // Larger thumbnail
      console.log('[Thumbnail API] Using thumbnail URL:', thumbnailUrl);

      // Fetch the thumbnail from Google
      const thumbnailResponse = await fetch(thumbnailUrl);

      if (!thumbnailResponse.ok) {
        throw new Error(`Failed to fetch thumbnail: ${thumbnailResponse.status}`);
      }

      const arrayBuffer = await thumbnailResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log('[Thumbnail API] Thumbnail downloaded, size:', buffer.length, 'bytes');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': file.data.mimeType || 'image/jpeg',
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Fallback: download the actual file (smaller version)
    console.log('[Thumbnail API] No thumbnail available, fetching file...');
    const response = await drive.files.get(
      {
        fileId: photoId,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    console.log('[Thumbnail API] File downloaded, size:', buffer.length, 'bytes');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.data.mimeType || 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Thumbnail API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thumbnail', details: String(error) },
      { status: 500 }
    );
  }
}
