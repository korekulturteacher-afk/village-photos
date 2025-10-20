import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { downloadPhoto } from '@/lib/google-drive';
import archiver from 'archiver';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    if (!session.user.isAllowed) {
      return NextResponse.json({ error: '회원 권한이 필요합니다' }, { status: 403 });
    }

    const { requestId } = await params;

    // Get the download request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('download_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_email', session.user.email)
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (request.status !== 'approved') {
      return NextResponse.json(
        { error: '승인되지 않은 요청입니다' },
        { status: 403 }
      );
    }

    // Get photo details from database
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('*')
      .in('id', request.photo_ids);

    if (photosError || !photos || photos.length === 0) {
      return NextResponse.json(
        { error: '사진을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    console.log(`[Download] Starting download of ${photos.length} photos for request ${requestId}`);

    // Collect all data in buffer first
    const chunks: Buffer[] = [];

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 6 },
    });

    // Collect archive data in chunks
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('[Download] Archive error:', err);
      throw err;
    });

    // Download photos from Google Drive and add to archive
    for (const photo of photos) {
      try {
        console.log(`[Download] Downloading photo: ${photo.name} (${photo.id})`);

        const photoBuffer = await downloadPhoto(photo.id);

        if (!photoBuffer || photoBuffer.length === 0) {
          console.warn(`[Download] Skipping empty buffer for photo ${photo.name} (${photo.id})`);
          continue;
        }

        console.log(`[Download] Photo ${photo.name} downloaded: ${photoBuffer.length} bytes`);

        // Add buffer to archive
        archive.append(photoBuffer, { name: photo.name });
      } catch (error) {
        console.error(`[Download] Error downloading photo ${photo.name}:`, error);
      }
    }

    console.log(`[Download] All photos added, finalizing archive`);

    // Wait for archive to finish
    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => {
        console.log(`[Download] Archive finalized, total size: ${Buffer.concat(chunks).length} bytes`);
        resolve();
      });

      archive.on('error', reject);

      // Finalize the archive
      archive.finalize();
    });

    // Combine all chunks into final buffer
    const zipBuffer = Buffer.concat(chunks);

    if (zipBuffer.length === 0) {
      console.error('[Download] Error: Empty zip file generated');
      return NextResponse.json(
        { error: '다운로드 파일 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    console.log(`[Download] Sending zip file: ${zipBuffer.length} bytes`);

    // Update download_requests with downloaded_at timestamp
    await supabaseAdmin
      .from('download_requests')
      .update({
        downloaded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Return the zip file as a buffer
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="photos-${requestId}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Download] Error downloading photos:', error);
    return NextResponse.json(
      { error: '다운로드 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
