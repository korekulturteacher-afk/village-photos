import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@/lib/admin-password';

// Get all invite codes
export async function GET(req: NextRequest) {
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

    const { data: codes, error } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invite codes:', error);
      return NextResponse.json(
        { error: '초대 코드를 가져오는 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      codes,
    });
  } catch (error) {
    console.error('Error fetching invite codes:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Create new invite code
export async function POST(req: NextRequest) {
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

    const { code, description } = await req.json();

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: '초대 코드를 입력해주세요' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const { data: existingCode } = await supabaseAdmin
      .from('invite_codes')
      .select('code')
      .eq('code', code.trim())
      .single();

    if (existingCode) {
      return NextResponse.json(
        { error: '이미 존재하는 초대 코드입니다' },
        { status: 400 }
      );
    }

    // Create new invite code
    const { data: newCode, error: insertError } = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code: code.trim(),
        description: description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invite code:', insertError);
      return NextResponse.json(
        { error: '초대 코드 생성 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code: newCode,
      message: '초대 코드가 생성되었습니다',
    });
  } catch (error) {
    console.error('Error creating invite code:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
