import { NextRequest, NextResponse } from 'next/server';
import { downloadThumbnail } from '@/lib/google-drive';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Download thumbnail from Google Drive (200px for faster loading)
    const thumbnailBuffer = await downloadThumbnail(fileId, 200);

    if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
      return NextResponse.json({ error: '썸네일을 찾을 수 없습니다' }, { status: 404 });
    }

    // Set appropriate headers with longer cache for thumbnails
    const response = new NextResponse(thumbnailBuffer);
    response.headers.set('Content-Type', 'image/jpeg');
    response.headers.set('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days cache
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
