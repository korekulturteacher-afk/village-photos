import { NextRequest, NextResponse } from 'next/server';
import { downloadPhoto, getPhoto } from '@/lib/google-drive';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Get photo metadata to determine content type
    const photoMeta = await getPhoto(fileId);
    const mimeType = photoMeta?.mimeType || 'image/jpeg';

    // Download photo from Google Drive
    const photoBuffer = await downloadPhoto(fileId);

    if (!photoBuffer || photoBuffer.length === 0) {
      return NextResponse.json({ error: '이미지를 찾을 수 없습니다' }, { status: 404 });
    }

    // Set appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const response = new NextResponse(new Uint8Array(photoBuffer));
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    response.headers.set('Content-Length', photoBuffer.length.toString());

    return response;
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: '이미지를 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}