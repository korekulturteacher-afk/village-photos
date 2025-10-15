import { NextRequest, NextResponse } from 'next/server';
import { downloadThumbnail } from '@/lib/google-drive';
import { thumbnailCache } from '@/lib/thumbnail-cache';
import sharp from 'sharp';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const cacheKey = `blur-${fileId}`;

    // Check server-side cache first
    let blurBuffer = thumbnailCache.get(cacheKey);

    if (!blurBuffer) {
      // Download thumbnail from Google Drive
      const thumbnailBuffer = await downloadThumbnail(fileId, 200);

      if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
        return NextResponse.json({ error: '썸네일을 찾을 수 없습니다' }, { status: 404 });
      }

      // Generate tiny blur placeholder (20px width)
      blurBuffer = await sharp(thumbnailBuffer)
        .resize(20, null, { fit: 'inside' })
        .blur(5)
        .jpeg({ quality: 50 })
        .toBuffer();

      // Store in cache
      thumbnailCache.set(cacheKey, blurBuffer);
    }

    // Convert to base64 data URL
    const base64 = blurBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // Return as JSON with data URL
    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error('[Blur API] Error generating blur placeholder:', error);
    return NextResponse.json(
      { error: 'Blur placeholder 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
