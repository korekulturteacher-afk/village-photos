import { NextRequest, NextResponse } from 'next/server';
import { downloadThumbnail, getPhoto } from '@/lib/google-drive';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Get photo metadata to determine content type
    const photoMeta = await getPhoto(fileId);
    const mimeType = photoMeta?.mimeType || 'image/jpeg';

    // Download thumbnail from Google Drive
    const thumbnailBuffer = await downloadThumbnail(fileId, 400);

    if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
      return NextResponse.json({ error: '썸네일을 찾을 수 없습니다' }, { status: 404 });
    }

    // Set appropriate headers with longer cache for thumbnails
    const response = new NextResponse(thumbnailBuffer);
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Cache-Control', 'public, max-age=604800, immutable'); // 7 days cache
    response.headers.set('Content-Length', thumbnailBuffer.length.toString());

    return response;
  } catch (error) {
    console.error('[Thumbnail API] Error serving thumbnail:', error);
    return NextResponse.json(
      { error: '썸네일을 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
