import { NextRequest, NextResponse } from 'next/server';
import { downloadPhoto, getPhoto } from '@/lib/google-drive';

// Allow longer processing time on Vercel when large files are involved.
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    console.log('[Thumbnail API] Fetching thumbnail for:', photoId);

    const photo = await getPhoto(photoId);
    const mimeType = photo?.mimeType ?? 'image/jpeg';

    if (photo?.thumbnailLink) {
      try {
        const url = new URL(photo.thumbnailLink);
        url.searchParams.set('sz', 'w400');

        const thumbResponse = await fetch(url.toString());
        if (thumbResponse.ok) {
          const buffer = Buffer.from(await thumbResponse.arrayBuffer());

          if (buffer.length > 0) {
            console.log(
              '[Thumbnail API] Served Google thumbnail, size:',
              buffer.length,
              'bytes'
            );

            return new NextResponse(new Uint8Array(buffer), {
              headers: {
                'Content-Type': mimeType,
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
              },
            });
          }

          console.warn('[Thumbnail API] Google thumbnail returned empty buffer.');
        } else {
          console.warn(
            `[Thumbnail API] Google thumbnail fetch failed: ${thumbResponse.status} ${thumbResponse.statusText}`
          );
        }
      } catch (error) {
        console.warn('[Thumbnail API] Unable to fetch Google thumbnail directly:', error);
      }
    }

    console.log('[Thumbnail API] Falling back to direct download for:', photoId);
    const fallbackBuffer = await downloadPhoto(photoId);

    if (!fallbackBuffer || fallbackBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch thumbnail' },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(fallbackBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fallbackBuffer.length.toString(),
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
