import { NextRequest, NextResponse } from 'next/server';
import { downloadPhoto, getPhoto } from '@/lib/google-drive';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const startTime = Date.now();
  try {
    const { fileId } = await params;

    console.log('[Image API] ========================================');
    console.log('[Image API] Request for photo:', fileId);
    console.log('[Image API] Time:', new Date().toISOString());

    // Get photo metadata to determine content type
    const photoMeta = await getPhoto(fileId);
    const mimeType = photoMeta?.mimeType || 'image/jpeg';
    console.log('[Image API] Photo metadata:', {
      name: photoMeta?.name,
      mimeType,
      size: photoMeta?.size
    });

    // Download photo from Google Drive
    const photoBuffer = await downloadPhoto(fileId);
    
    const elapsed = Date.now() - startTime;
    console.log('[Image API] Photo downloaded in', elapsed, 'ms');
    console.log('[Image API] Buffer size:', photoBuffer?.length || 0, 'bytes');
    console.log('[Image API] Buffer type:', typeof photoBuffer);
    console.log('[Image API] Is Buffer?:', Buffer.isBuffer(photoBuffer));

    if (!photoBuffer || photoBuffer.length === 0) {
      console.error('[Image API] ERROR: Empty or null buffer!');
      return NextResponse.json({ error: '이미지를 찾을 수 없습니다' }, { status: 404 });
    }

    // Set appropriate headers
    const response = new NextResponse(photoBuffer);
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    response.headers.set('Content-Length', photoBuffer.length.toString());
    
    console.log('[Image API] Response headers:', {
      'Content-Type': mimeType,
      'Content-Length': photoBuffer.length
    });
    console.log('[Image API] ========================================');
    
    return response;
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: '이미지를 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}