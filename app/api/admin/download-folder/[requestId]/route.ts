import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { drive } from '@/lib/google-drive';
import archiver from 'archiver';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const password = authHeader?.replace('Bearer ', '');

    if (!password) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Verify admin password
    const adminPasswordResponse = await fetch(
      `${req.nextUrl.origin}/api/admin/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }
    );

    if (!adminPasswordResponse.ok) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const { requestId } = await params;

    // Get the download request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('download_requests')
      .select('*')
      .eq('id', requestId)
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

    console.log(`[Admin Download Folder] Starting download of ${photos.length} photos for request ${requestId}`);

    // Create user folder name
    const userName = request.user_name || request.user_email.split('@')[0];
    const date = new Date(request.requested_at).toISOString().split('T')[0];
    const folderName = `${userName}_${date}`;

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
      console.error('[Admin Download Folder] Archive error:', err);
      throw err;
    });

    // Download photos from Google Drive and add to archive
    for (const photo of photos) {
      try {
        console.log(`[Admin Download Folder] Downloading photo: ${photo.name} (${photo.id})`);

        const response = await drive.files.get(
          {
            fileId: photo.id,
            alt: 'media',
          },
          { responseType: 'stream' }
        );

        // Collect stream data in buffer
        const photoChunks: Buffer[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = response.data as any;

        await new Promise<void>((resolve, reject) => {
          stream.on('data', (chunk: Buffer) => {
            photoChunks.push(chunk);
          });

          stream.on('end', () => {
            const photoBuffer = Buffer.concat(photoChunks);
            console.log(`[Admin Download Folder] Photo ${photo.name} downloaded: ${photoBuffer.length} bytes`);

            // Add buffer to archive with folder structure
            archive.append(photoBuffer, { name: `${folderName}/${photo.name}` });
            resolve();
          });

          stream.on('error', (err: Error) => {
            console.error(`[Admin Download Folder] Stream error for photo ${photo.name}:`, err);
            reject(err);
          });
        });
      } catch (error) {
        console.error(`[Admin Download Folder] Error downloading photo ${photo.name}:`, error);
      }
    }

    console.log(`[Admin Download Folder] All photos added, finalizing archive`);

    // Wait for archive to finish
    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => {
        console.log(`[Admin Download Folder] Archive finalized, total size: ${Buffer.concat(chunks).length} bytes`);
        resolve();
      });

      archive.on('error', reject);

      // Finalize the archive
      archive.finalize();
    });

    // Combine all chunks into final buffer
    const zipBuffer = Buffer.concat(chunks);

    if (zipBuffer.length === 0) {
      console.error('[Admin Download Folder] Error: Empty zip file generated');
      return NextResponse.json(
        { error: '다운로드 파일 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    console.log(`[Admin Download Folder] Sending zip file: ${zipBuffer.length} bytes`);

    // Return the zip file as a buffer
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folderName}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Admin Download Folder] Error downloading folder:', error);
    return NextResponse.json(
      { error: '폴더 다운로드 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
