import { NextRequest, NextResponse } from 'next/server';
import { changePassword } from '@/lib/admin-password';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '모든 필드를 입력하세요' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 최소 6자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      return NextResponse.json({ success: true, message: '비밀번호가 변경되었습니다' });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Admin Change Password API] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
