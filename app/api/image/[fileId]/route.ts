import { NextRequest, NextResponse } from 'next/server';
import { downloadPhoto, getPhoto } from '@/lib/google-drive';

// Vercel Serverless Function timeout (Pro plan: 60s, Hobby: 10s)
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    console.log(`[Image API] Serving image for fileId: ${fileId}`);

    // Get photo metadata to determine content type
    const photoMeta = await getPhoto(fileId);

    if (!photoMeta) {
      console.error(`[Image API] Photo metadata not found for fileId: ${fileId}`);
      return NextResponse.json(
        { error: '이미지를 찾을 수 없습니다', fileId },
        { status: 404 }
      );
    }

    const mimeType = photoMeta.mimeType || 'image/jpeg';

    // Download photo from Google Drive
    const photoBuffer = await downloadPhoto(fileId);

    if (!photoBuffer || photoBuffer.length === 0) {
      console.error(`[Image API] Photo buffer is empty for fileId: ${fileId}`);
      return NextResponse.json(
        { error: '이미지를 다운로드할 수 없습니다. 파일이 삭제되었거나 접근 권한이 없습니다.', fileId },
        { status: 404 }
      );
    }

    console.log(`[Image API] Successfully served image for fileId: ${fileId}, size: ${photoBuffer.length} bytes`);

    // Set appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const response = new NextResponse(new Uint8Array(photoBuffer));
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    response.headers.set('Content-Length', photoBuffer.length.toString());

    return response;
  } catch (error) {
    console.error('[Image API] Error serving image:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: '이미지를 불러오는 중 오류가 발생했습니다',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}