import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { verifyPassword } from '@/lib/admin-password';
import { listPhotos } from '@/lib/google-drive';

const MISSING_TABLE_REGEX =
  /could not find the table 'public\.photos' in the schema cache/i;

const DRIVE_FOLDER_IDS = [
  process.env.GOOGLE_DRIVE_FOLDER_ID_1,
  process.env.GOOGLE_DRIVE_FOLDER_ID_2,
].filter((value): value is string => Boolean(value));

type SupabasePhotoRow = {
  id: string;
  name: string;
  mime_type: string;
  size: number | string | null;
  thumbnail_link: string | null;
  web_content_link: string | null;
  web_view_link: string | null;
  created_time: string | null;
  modified_time: string | null;
  is_approved: boolean | null;
  is_public: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatDrivePhotos(photos: Awaited<ReturnType<typeof listPhotos>>) {
  return photos.map((photo) => ({
    id: photo.id,
    name: photo.name,
    mime_type: photo.mimeType,
    size: photo.size ?? null,
    thumbnail_link: photo.thumbnailLink ?? null,
    web_content_link: photo.webContentLink ?? null,
    web_view_link: photo.webViewLink ?? null,
    created_time: photo.createdTime ?? null,
    modified_time: photo.modifiedTime ?? null,
    is_approved: false,
    is_public: false,
    created_at: null,
    updated_at: null,
  }));
}

async function ensureAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const password = authHeader.substring(7);
  const isValid = await verifyPassword(password);
  if (!isValid) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
  }

  return null;
}

function isMissingTableError(code?: string, message?: string) {
  if (!message) return code === '42P01';
  return code === '42P01' || MISSING_TABLE_REGEX.test(message);
}

async function respondWithDrivePhotos(status: string) {
  if (DRIVE_FOLDER_IDS.length === 0) {
    return NextResponse.json(
      {
        error:
          '사진 목록 테이블과 Google Drive 폴더 ID가 모두 없습니다. 환경 변수를 확인해주세요.',
      },
      { status: 500 },
    );
  }

  if (status === 'approved') {
    return NextResponse.json({
      photos: [],
      source: 'google-drive',
    });
  }

  const photos = await listPhotos(DRIVE_FOLDER_IDS);
  // Natural sort by name ascending (숫자를 실제 숫자로 비교: 66, 67, 68, 660, 661...)
  photos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return NextResponse.json({
    photos: formatDrivePhotos(photos),
    source: 'google-drive',
  });
}

export async function GET(request: NextRequest) {
  try {
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, pending, approved

    let query = supabase.from('photos').select('*');

    if (status === 'pending') {
      query = query.eq('is_approved', false);
    } else if (status === 'approved') {
      query = query.eq('is_approved', true);
    }

    const { data: photos, error } = await query;

    if (error) {
      const message =
        error.message ??
        (typeof error === 'object' ? JSON.stringify(error) : String(error));

      if (isMissingTableError(error.code, message)) {
        console.warn(
          '[Admin Photos] photos 테이블이 없어 Google Drive 데이터를 사용합니다.',
        );
        return respondWithDrivePhotos(status);
      }

      console.error('Error fetching photos:', error);
      return NextResponse.json(
        {
          error: '사진 목록을 불러오는 중 오류가 발생했습니다',
          details: message,
        },
        { status: 500 },
      );
    }

    // Natural sort by name ascending (숫자를 실제 숫자로 비교: 66, 67, 68, 660, 661...)
    const sortedPhotos = [...(photos as SupabasePhotoRow[])].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    return NextResponse.json({
      photos: sortedPhotos ?? [],
      source: 'supabase',
    });
  } catch (error) {
    console.error('Error in admin photos API:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const supabase = createAdminClient();
    const body = await request.json();
    const { action, photoIds, isPublic } = body as {
      action: 'approve' | 'reject' | 'toggle_public';
      photoIds: string[];
      isPublic?: boolean;
    };

    if (!action || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
    }

    if (action === 'approve') {
      const { error } = await supabase
        .from('photos')
        .update({
          is_approved: true,
          is_public: Boolean(isPublic),
          approved_by: 'admin',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', photoIds);

      if (error) {
        if (isMissingTableError(error.code, error.message)) {
          return NextResponse.json(
            {
              error:
                '사진 승인 정보를 저장할 테이블이 없습니다. Supabase 마이그레이션을 적용한 뒤 다시 시도해주세요.',
            },
            { status: 500 },
          );
        }

        console.error('Error approving photos:', error);
        return NextResponse.json(
          { error: '사진 승인 처리에 실패했습니다' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: `${photoIds.length}장의 사진이 승인되었습니다`,
      });
    }

    if (action === 'reject') {
      const { error } = await supabase
        .from('photos')
        .update({
          is_approved: false,
          is_public: false,
          updated_at: new Date().toISOString(),
        })
        .in('id', photoIds);

      if (error) {
        if (isMissingTableError(error.code, error.message)) {
          return NextResponse.json(
            {
              error:
                '사진 상태를 저장할 테이블이 없습니다. Supabase 마이그레이션을 적용한 뒤 다시 시도해주세요.',
            },
            { status: 500 },
          );
        }

        console.error('Error rejecting photos:', error);
        return NextResponse.json(
          { error: '사진 반려 처리에 실패했습니다' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: `${photoIds.length}장의 사진이 반려되었습니다`,
      });
    }

    if (action === 'toggle_public') {
      const { error } = await supabase
        .from('photos')
        .update({
          is_public: Boolean(isPublic),
          updated_at: new Date().toISOString(),
        })
        .in('id', photoIds);

      if (error) {
        if (isMissingTableError(error.code, error.message)) {
          return NextResponse.json(
            {
              error:
                '공개 상태를 저장할 테이블이 없습니다. Supabase 마이그레이션을 적용한 뒤 다시 시도해주세요.',
            },
            { status: 500 },
          );
        }

        console.error('Error toggling public status:', error);
        return NextResponse.json(
          { error: '공개 상태 변경에 실패했습니다' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: `${photoIds.length}장의 공개 상태가 변경되었습니다`,
      });
    }

    return NextResponse.json({ error: '알 수 없는 작업입니다' }, { status: 400 });
  } catch (error) {
    console.error('Error in admin photos API:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
