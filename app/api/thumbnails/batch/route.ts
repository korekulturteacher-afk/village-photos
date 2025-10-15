import { NextRequest, NextResponse } from 'next/server';
import { downloadThumbnail } from '@/lib/google-drive';
import { thumbnailCache } from '@/lib/thumbnail-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileIds } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'fileIds 배열이 필요합니다' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (fileIds.length > 50) {
      return NextResponse.json(
        { error: '최대 50개까지만 요청 가능합니다' },
        { status: 400 }
      );
    }

    // Process all thumbnails in parallel
    const results = await Promise.allSettled(
      fileIds.map(async (fileId: string) => {
        try {
          // Check cache first
          let thumbnailBuffer = thumbnailCache.get(fileId);

          if (!thumbnailBuffer) {
            thumbnailBuffer = await downloadThumbnail(fileId, 200);
            if (thumbnailBuffer) {
              thumbnailCache.set(fileId, thumbnailBuffer);
            }
          }

          if (!thumbnailBuffer) {
            return { fileId, error: 'Thumbnail not found' };
          }

          // Convert to base64
          const base64 = thumbnailBuffer.toString('base64');
          return {
            fileId,
            dataUrl: `data:image/jpeg;base64,${base64}`,
          };
        } catch (error) {
          console.error(`[Batch] Error processing ${fileId}:`, error);
          return { fileId, error: 'Processing failed' };
        }
      })
    );

    // Format response
    const thumbnails = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          fileId: fileIds[index],
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    return NextResponse.json({ thumbnails });
  } catch (error) {
    console.error('[Batch API] Error:', error);
    return NextResponse.json(
      { error: '배치 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
