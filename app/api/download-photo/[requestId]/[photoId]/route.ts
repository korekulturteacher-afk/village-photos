import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { downloadPhoto } from '@/lib/google-drive';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; photoId: string }> }
) {
  const { requestId, photoId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    if (!session.user.isAllowed) {
      return NextResponse.json({ error: '회원 권한이 필요합니다' }, { status: 403 });
    }

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

    // Check if photoId is in the request's photo_ids
    if (!request.photo_ids.includes(photoId)) {
      return NextResponse.json(
        { error: '요청에 포함되지 않은 사진입니다' },
        { status: 403 }
      );
    }

    // Try to get photo name from database (optional)
    const { data: photo } = await supabaseAdmin
      .from('photos')
      .select('name')
      .eq('id', photoId)
      .single();

    const photoName = photo?.name || `photo-${photoId}.jpg`;

    console.log(`[Download Photo] Downloading photo: ${photoName} (${photoId})`);

    // Download photo from Google Drive using lib function (same as /api/image)
    const photoBuffer = await downloadPhoto(photoId);

    if (!photoBuffer || photoBuffer.length === 0) {
      console.error('[Download Photo] Error: Empty photo file');
      return NextResponse.json(
        { error: '사진 다운로드에 실패했습니다' },
        { status: 500 }
      );
    }

    console.log(`[Download Photo] Photo ${photoName} downloaded: ${photoBuffer.length} bytes`);

    // Determine content type based on file extension
    let contentType = 'image/jpeg';
    const extension = photoName.split('.').pop()?.toLowerCase();
    if (extension === 'png') {
      contentType = 'image/png';
    } else if (extension === 'gif') {
      contentType = 'image/gif';
    } else if (extension === 'webp') {
      contentType = 'image/webp';
    }

    // Return the photo file as a buffer
    return new NextResponse(new Uint8Array(photoBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(photoName)}"`,
        'Content-Length': photoBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Download Photo] Error downloading photo:', error);
    console.error('[Download Photo] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      photoId,
    });
    return NextResponse.json(
      {
        error: '사진 다운로드 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
