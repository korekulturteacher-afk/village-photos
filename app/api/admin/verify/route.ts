import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/admin-password';

const DEFAULT_PASSWORD = 'password!';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: '비밀번호를 입력하세요' },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(password);

    if (isValid) {
      // Check if user is still using default password
      const isDefaultPassword = password === DEFAULT_PASSWORD;

      return NextResponse.json({
        success: true,
        isDefaultPassword
      });
    } else {
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[Admin Verify API] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
