import { NextRequest, NextResponse } from 'next/server';
import { listPhotos } from '@/lib/google-drive';
import { createAdminClient } from '@/lib/supabase';
import { verifyPassword } from '@/lib/admin-password';

const MISSING_TABLE_REGEX =
  /could not find the table 'public\.photos' in the schema cache/i;

function isMissingTableError(code?: string, message?: string) {
  if (!message) return code === '42P01' || code === 'PGRST205';
  return code === '42P01' || code === 'PGRST205' || MISSING_TABLE_REGEX.test(message);
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin password
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const password = authHeader.substring(7);
    const isValid = await verifyPassword(password);
    if (!isValid) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    console.log('[Sync Photos API] Starting photo synchronization');

    // Get folder IDs from environment
    const folderIds = [
      process.env.GOOGLE_DRIVE_FOLDER_ID_1!,
      process.env.GOOGLE_DRIVE_FOLDER_ID_2!,
    ].filter(Boolean);

    if (folderIds.length === 0) {
      console.error('[Sync Photos API] No folder IDs configured');
      return NextResponse.json(
        { error: '폴더 정보를 찾을 수 없습니다' },
        { status: 500 }
      );
    }

    // Fetch photos from Google Drive
    console.log('[Sync Photos API] Fetching photos from Google Drive...');
    const drivePhotos = await listPhotos(folderIds);
    console.log('[Sync Photos API] Found', drivePhotos.length, 'photos in Google Drive');

    const supabase = createAdminClient();

    // Get existing photos from database
    const { data: existingPhotos, error: fetchError } = await supabase
      .from('photos')
      .select('id');

    if (fetchError) {
      console.error('[Sync Photos API] Error fetching existing photos:', fetchError);

      const message =
        fetchError.message ??
        (typeof fetchError === 'object' ? JSON.stringify(fetchError) : String(fetchError));

      if (isMissingTableError(fetchError.code, message)) {
        console.warn('[Sync Photos API] photos 테이블이 없습니다. 먼저 테이블을 생성해주세요.');
        return NextResponse.json(
          {
            error: 'photos 테이블이 없습니다',
            hint: 'Supabase SQL Editor에서 photos 테이블을 먼저 생성해주세요.',
            details: `Google Drive에서 ${drivePhotos.length}개의 사진을 찾았지만, Supabase에 저장할 테이블이 없습니다.`,
            sqlRequired: true
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: '기존 사진 정보를 불러오는데 실패했습니다' },
        { status: 500 }
      );
    }

    const existingFileIds = new Set(existingPhotos.map(p => p.id));
    const newPhotos = drivePhotos.filter(photo => !existingFileIds.has(photo.id));

    console.log('[Sync Photos API] Found', newPhotos.length, 'new photos to sync');

    if (newPhotos.length === 0) {
      return NextResponse.json({
        message: '동기화할 새로운 사진이 없습니다.',
        synced: 0,
        total: drivePhotos.length
      });
    }

    // Insert new photos into database
    const photosToInsert = newPhotos.map(photo => ({
      id: photo.id,
      name: photo.name,
      mime_type: photo.mimeType,
      size: photo.size,
      thumbnail_link: photo.thumbnailLink,
      web_content_link: photo.webContentLink,
      web_view_link: photo.webViewLink,
      created_time: photo.createdTime,
      modified_time: photo.modifiedTime,
      is_approved: true, // 기본적으로 모두 승인
      is_public: true,   // 기본적으로 모두 공개
    }));

    const { error: insertError } = await supabase
      .from('photos')
      .insert(photosToInsert);

    if (insertError) {
      console.error('[Sync Photos API] Error inserting photos:', insertError);
      return NextResponse.json(
        { error: '사진 동기화에 실패했습니다' },
        { status: 500 }
      );
    }

    console.log('[Sync Photos API] Successfully synced', newPhotos.length, 'photos');

    return NextResponse.json({
      message: `${newPhotos.length}개의 새로운 사진이 동기화되었습니다.`,
      synced: newPhotos.length,
      total: drivePhotos.length
    });
  } catch (error) {
    console.error('[Sync Photos API] Error syncing photos:', error);
    return NextResponse.json(
      { error: '사진 동기화 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}