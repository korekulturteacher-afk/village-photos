import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { drive } from '@/lib/google-drive';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    if (!session.user.isAllowed) {
      return NextResponse.json({ error: '회원 권한이 필요합니다' }, { status: 403 });
    }

    const { requestId, photoId } = await params;

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

    // Get photo details from database
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json(
        { error: '사진을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    console.log(`[Download Photo] Downloading photo: ${photo.name} (${photo.id})`);

    // Download photo from Google Drive using arraybuffer (same as /api/image)
    const response = await drive.files.get(
      {
        fileId: photo.id,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );

    // Handle different response types (same as downloadPhoto in lib/google-drive.ts)
    let photoBuffer: Buffer;
    if (Buffer.isBuffer(response.data)) {
      photoBuffer = response.data;
    } else if (response.data instanceof ArrayBuffer) {
      photoBuffer = Buffer.from(response.data);
    } else if (typeof response.data === 'string') {
      photoBuffer = Buffer.from(response.data, 'base64');
    } else {
      photoBuffer = Buffer.from(response.data);
    }

    if (photoBuffer.length === 0) {
      console.error('[Download Photo] Error: Empty photo file');
      return NextResponse.json(
        { error: '사진 다운로드에 실패했습니다' },
        { status: 500 }
      );
    }

    console.log(`[Download Photo] Photo ${photo.name} downloaded: ${photoBuffer.length} bytes`);

    // Determine content type based on file extension
    let contentType = 'image/jpeg';
    const extension = photo.name.split('.').pop()?.toLowerCase();
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
        'Content-Disposition': `attachment; filename="${encodeURIComponent(photo.name)}"`,
        'Content-Length': photoBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Download Photo] Error downloading photo:', error);
    return NextResponse.json(
      { error: '사진 다운로드 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
