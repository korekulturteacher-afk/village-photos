import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { code, email, name } = await req.json();

    if (!code || !email) {
      return NextResponse.json(
        { error: '코드와 이메일이 필요합니다' },
        { status: 400 }
      );
    }

    // 1. Check if code exists and is valid
    const { data: inviteCode, error: codeError } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (codeError || !inviteCode) {
      return NextResponse.json(
        { error: '유효하지 않은 초대 코드입니다' },
        { status: 400 }
      );
    }

    // 2. Check if code is active
    if (!inviteCode.is_active) {
      return NextResponse.json(
        { error: '비활성화된 초대 코드입니다' },
        { status: 400 }
      );
    }

    // 3. Check expiration
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '만료된 초대 코드입니다' },
        { status: 400 }
      );
    }

    // 4. Check usage limit
    if (
      inviteCode.max_uses &&
      inviteCode.used_count >= inviteCode.max_uses
    ) {
      return NextResponse.json(
        { error: '초대 코드 사용 횟수가 초과되었습니다' },
        { status: 400 }
      );
    }

    // 5. Check if email already used this code
    const { data: existingUsage } = await supabaseAdmin
      .from('invite_code_usage')
      .select('id')
      .eq('code', code)
      .eq('user_email', email)
      .single();

    if (existingUsage) {
      return NextResponse.json({
        success: true,
        message: '이미 등록된 사용자입니다',
      });
    }

    // 6. Check if user is already in whitelist
    const { data: existingUser } = await supabaseAdmin
      .from('allowed_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Record usage but don't create duplicate user
      await supabaseAdmin.from('invite_code_usage').insert({
        code,
        user_email: email,
        user_name: name,
        ip_address: req.headers.get('x-forwarded-for') || req.ip,
      });

      await supabaseAdmin
        .from('invite_codes')
        .update({ used_count: inviteCode.used_count + 1 })
        .eq('code', code);

      return NextResponse.json({
        success: true,
        message: '이미 등록된 사용자입니다',
      });
    }

    // 7. Add user to whitelist and record usage
    const { error: insertError } = await supabaseAdmin
      .from('allowed_users')
      .insert({
        email,
        name,
        invited_by: code,
      });

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return NextResponse.json(
        { error: '사용자 등록 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // Record usage
    await supabaseAdmin.from('invite_code_usage').insert({
      code,
      user_email: email,
      user_name: name,
      ip_address: req.headers.get('x-forwarded-for') || req.ip,
    });

    // Increment usage count
    await supabaseAdmin
      .from('invite_codes')
      .update({ used_count: inviteCode.used_count + 1 })
      .eq('code', code);

    return NextResponse.json({
      success: true,
      message: '초대 코드가 성공적으로 인증되었습니다',
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
