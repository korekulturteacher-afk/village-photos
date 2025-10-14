import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@/lib/admin-password';

// Delete invite code
export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Verify admin password
    const authHeader = req.headers.get('x-admin-password');
    if (!authHeader || !(await verifyPassword(authHeader))) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const { code } = params;

    // Delete the invite code
    const { error: deleteError } = await supabaseAdmin
      .from('invite_codes')
      .delete()
      .eq('code', code);

    if (deleteError) {
      console.error('Error deleting invite code:', deleteError);
      return NextResponse.json(
        { error: '초대 코드 삭제 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '초대 코드가 삭제되었습니다',
    });
  } catch (error) {
    console.error('Error deleting invite code:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Toggle invite code active status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Verify admin password
    const authHeader = req.headers.get('x-admin-password');
    if (!authHeader || !(await verifyPassword(authHeader))) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const { code } = params;
    const { is_active } = await req.json();

    // Update the invite code
    const { data: updatedCode, error: updateError } = await supabaseAdmin
      .from('invite_codes')
      .update({ is_active })
      .eq('code', code)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invite code:', updateError);
      return NextResponse.json(
        { error: '초대 코드 업데이트 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code: updatedCode,
      message: '초대 코드가 업데이트되었습니다',
    });
  } catch (error) {
    console.error('Error updating invite code:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
