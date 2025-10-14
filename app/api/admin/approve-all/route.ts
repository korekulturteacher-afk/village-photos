import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { verifyPassword } from '@/lib/admin-password';

const MISSING_TABLE_REGEX =
  /could not find the table 'public\.photos' in the schema cache/i;

function isMissingTableError(code?: string, message?: string) {
  if (!message) return code === '42P01';
  return code === '42P01' || MISSING_TABLE_REGEX.test(message);
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

    // Parse request body for public option
    const body = await request.json().catch(() => ({ isPublic: true }));
    const isPublic = body.isPublic !== false; // Default to true if not specified

    const supabase = createAdminClient();

    // Update all photos to approved with specified public setting
    const { data, error } = await supabase
      .from('photos')
      .update({
        is_approved: true,
        is_public: isPublic,
        approved_at: new Date().toISOString(),
        approved_by: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('is_approved', false);

    if (error) {
      const message =
        error.message ??
        (typeof error === 'object' ? JSON.stringify(error) : String(error));

      if (isMissingTableError(error.code, message)) {
        console.warn(
          '[Approve All] photos 테이블이 없어 일괄 승인을 수행할 수 없습니다. Google Drive를 사용 중입니다.',
        );
        return NextResponse.json({
          error:
            'photos 테이블이 없습니다. Google Drive 모드에서는 모든 사진이 자동으로 승인됩니다. Supabase 마이그레이션을 적용하면 승인 관리 기능을 사용할 수 있습니다.',
        }, { status: 400 });
      }

      console.error('Error approving all photos:', error);
      return NextResponse.json({ error: '일괄 승인에 실패했습니다' }, { status: 500 });
    }

    const statusText = isPublic ? '공개로' : '비공개로';
    return NextResponse.json({
      success: true,
      message: `모든 사진이 승인되고 ${statusText} 설정되었습니다`
    });
  } catch (error) {
    console.error('Error in approve-all API:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
