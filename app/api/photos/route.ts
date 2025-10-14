import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { listPhotos } from '@/lib/google-drive';

const DRIVE_FOLDER_IDS = [
  process.env.GOOGLE_DRIVE_FOLDER_ID_1,
  process.env.GOOGLE_DRIVE_FOLDER_ID_2,
].filter((value): value is string => Boolean(value));

interface SupabasePhotoRow {
  id: string;
  name: string;
  mime_type: string;
  size: string | number | null;
  thumbnail_link: string | null;
  web_content_link: string | null;
  web_view_link: string | null;
  created_time: string | null;
  modified_time: string | null;
  is_approved: boolean | null;
  is_public: boolean | null;
}

function formatDatabasePhotos(rows: SupabasePhotoRow[]) {
  return rows.map((photo) => ({
    id: photo.id,
    name: photo.name,
    mimeType: photo.mime_type,
    webContentLink: photo.web_content_link ?? undefined,
    webViewLink: photo.web_view_link ?? undefined,
    thumbnailLink: photo.thumbnail_link ?? undefined,
    createdTime: photo.created_time ?? undefined,
    modifiedTime: photo.modified_time ?? undefined,
    size: photo.size ?? undefined,
    isApproved: Boolean(photo.is_approved),
    isPublic: Boolean(photo.is_public),
  }));
}

async function fetchFromGoogleDrive() {
  if (DRIVE_FOLDER_IDS.length === 0) {
    return NextResponse.json(
      { error: '필요한 Google Drive 폴더 ID가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  const photos = await listPhotos(DRIVE_FOLDER_IDS);

  // Natural sort by name ascending (숫자를 실제 숫자로 비교: 66, 67, 68, 660, 661...)
  photos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return NextResponse.json({
    success: true,
    count: photos.length,
    photos,
    source: 'google-drive',
  });
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Only return approved AND public photos for user gallery
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('is_approved', true)
      .eq('is_public', true);

    if (error) {
      const message =
        error.message ??
        (typeof error === 'object' ? JSON.stringify(error) : String(error));

      const shouldFallback =
        error.code === '42P01' ||
        (typeof message === 'string' &&
          /schema cache|does not exist|relation .*photos/i.test(message));

      if (shouldFallback) {
        console.warn(
          '[Photos API] photos 테이블이 없거나 조회할 수 없어 Google Drive로 폴백합니다.',
        );
        return fetchFromGoogleDrive();
      }

      console.error('[Photos API] Error fetching photos from database:', error);
      return NextResponse.json(
        {
          error: '사진을 불러오는 중 오류가 발생했습니다',
          details: message,
        },
        { status: 500 },
      );
    }

    if (!data?.length) {
      console.info('[Photos API] 승인되고 공개된 사진이 없어 Google Drive로 폴백합니다.');
      return fetchFromGoogleDrive();
    }

    // Natural sort by name ascending (숫자를 실제 숫자로 비교: 66, 67, 68, 660, 661...)
    const sortedData = [...data].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    return NextResponse.json({
      success: true,
      count: sortedData.length,
      photos: formatDatabasePhotos(sortedData as SupabasePhotoRow[]),
      source: 'supabase',
    });
  } catch (error) {
    console.error('[Photos API] Error fetching photos:', error);
    return NextResponse.json(
      {
        error: '사진을 불러오는 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
