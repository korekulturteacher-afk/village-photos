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

/**
 * Check if a file ID is a valid Google Drive format
 * Google Drive file IDs are 25-50 characters containing alphanumeric, hyphens, and underscores
 * They typically start with '1' and don't contain multiple underscores
 */
function isValidGoogleDriveId(id: string): boolean {
  // Check basic format
  if (!/^[a-zA-Z0-9_-]{25,50}$/.test(id)) {
    return false;
  }

  // Invalid patterns that indicate corrupted IDs
  // Example: "18_2wbppwJQQKJ6gdc9dGI1BaRQA2zWs2" (starts with digits followed by underscore)
  if (/^\d+_/.test(id)) {
    return false;
  }

  return true;
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
    const drivePhotos = await listPhotos(folderIds);

    const supabase = createAdminClient();

    // Step 1: Clean up invalid IDs from database
    let cleanedUpCount = 0;
    const { data: allExistingPhotos, error: fetchAllError } = await supabase
      .from('photos')
      .select('id, name');

    if (!fetchAllError && allExistingPhotos) {
      const invalidPhotos = allExistingPhotos.filter(p => !isValidGoogleDriveId(p.id));

      if (invalidPhotos.length > 0) {
        console.log(`[Sync Photos API] Found ${invalidPhotos.length} photos with invalid IDs, cleaning up...`);

        for (const photo of invalidPhotos) {
          console.log(`[Sync Photos API] Deleting invalid record: ${photo.id} (${photo.name})`);
          const { error: deleteError } = await supabase
            .from('photos')
            .delete()
            .eq('id', photo.id);

          if (!deleteError) {
            cleanedUpCount++;
          }
        }

        console.log(`[Sync Photos API] Successfully cleaned up ${cleanedUpCount} invalid records`);
      }
    }

    // Step 2: Continue with normal sync process

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

    if (newPhotos.length === 0 && cleanedUpCount === 0) {
      return NextResponse.json({
        message: '동기화할 새로운 사진이 없습니다.',
        synced: 0,
        total: drivePhotos.length,
        cleaned: 0
      });
    }

    if (newPhotos.length === 0 && cleanedUpCount > 0) {
      return NextResponse.json({
        message: `${cleanedUpCount}개의 잘못된 레코드를 정리했습니다. 새로운 사진은 없습니다.`,
        synced: 0,
        total: drivePhotos.length,
        cleaned: cleanedUpCount
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

    const message = cleanedUpCount > 0
      ? `${cleanedUpCount}개의 잘못된 레코드를 정리하고, ${newPhotos.length}개의 새로운 사진이 동기화되었습니다.`
      : `${newPhotos.length}개의 새로운 사진이 동기화되었습니다.`;

    return NextResponse.json({
      message,
      synced: newPhotos.length,
      total: drivePhotos.length,
      cleaned: cleanedUpCount
    });
  } catch (error) {
    console.error('[Sync Photos API] Error syncing photos:', error);
    return NextResponse.json(
      { error: '사진 동기화 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}