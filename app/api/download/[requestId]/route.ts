import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { drive } from '@/lib/google-drive';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export async function POST(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    if (!session.user.isAllowed) {
      return NextResponse.json({ error: '회원 권한이 필요합니다' }, { status: 403 });
    }

    const { requestId } = params;

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

    // Create a passthrough stream for the zip
    const passThrough = new PassThrough();

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Good balance between speed and compression
    });

    // Pipe archive to passthrough
    archive.pipe(passThrough);

    // Handle errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      passThrough.destroy(err);
    });

    // Download photos from Google Drive and add to archive
    const downloadPromises = photos.map(async (photo) => {
      try {
        const response = await drive.files.get(
          {
            fileId: photo.drive_id,
            alt: 'media',
          },
          { responseType: 'stream' }
        );

        // Add the file stream to the archive
        archive.append(response.data as any, { name: photo.name });
      } catch (error) {
        console.error(`Error downloading photo ${photo.name}:`, error);
      }
    });

    // Wait for all downloads to be added
    await Promise.all(downloadPromises);

    // Finalize the archive (no more files will be added)
    await archive.finalize();

    // Update download_requests with downloaded_at timestamp
    // Do this before sending response so it's recorded even if download fails
    await supabaseAdmin
      .from('download_requests')
      .update({
        downloaded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Convert passthrough stream to web stream for Next.js response
    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        passThrough.on('end', () => {
          controller.close();
        });

        passThrough.on('error', (err) => {
          controller.error(err);
        });
      },
    });

    // Return the zip file as a stream
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="photos-${requestId}.zip"`,
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Error downloading photos:', error);
    return NextResponse.json(
      { error: '다운로드 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
