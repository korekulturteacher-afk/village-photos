import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function withServerError(message: string, logLabel: string, error: unknown) {
  console.error(`[verify-code] ${logLabel}`, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    const { code, email, name } = await req.json();
    
    console.log('[verify-code] POST request received:', { code, email, name });

    if (!code || !email) {
      console.log('[verify-code] Missing code or email');
      return NextResponse.json({ error: '코드와 이메일이 필요합니다' }, { status: 400 });
    }

    const { data: inviteCode, error: inviteCodeError } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (inviteCodeError) {
      return withServerError(
        '초대 코드 정보를 불러오지 못했습니다. 환경 변수를 다시 확인해주세요.',
        'failed to fetch invite code',
        inviteCodeError,
      );
    }

    if (!inviteCode) {
      console.log('[verify-code] Invalid code:', code);
      return NextResponse.json({ error: '유효하지 않은 초대 코드입니다' }, { status: 400 });
    }
    
    console.log('[verify-code] Invite code found:', { 
      code: inviteCode.code, 
      is_active: inviteCode.is_active,
      used_count: inviteCode.used_count,
      max_uses: inviteCode.max_uses
    });

    if (!inviteCode.is_active) {
      console.log('[verify-code] Inactive code');
      return NextResponse.json({ error: '비활성화된 초대 코드입니다' }, { status: 400 });
    }

    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      console.log('[verify-code] Expired code');
      return NextResponse.json({ error: '만료된 초대 코드입니다' }, { status: 400 });
    }

    if (inviteCode.max_uses && inviteCode.used_count >= inviteCode.max_uses) {
      console.log('[verify-code] Max uses exceeded');
      return NextResponse.json({ error: '초대 코드 사용 가능 횟수를 초과했습니다' }, { status: 400 });
    }

    const { data: existingUsage, error: existingUsageError } = await supabaseAdmin
      .from('invite_code_usage')
      .select('id')
      .eq('code', code)
      .eq('user_email', email)
      .maybeSingle();

    if (existingUsageError) {
      return withServerError(
        '초대 코드 사용 내역을 확인하지 못했습니다. 관리자에게 문의하세요.',
        'failed to fetch invite code usage',
        existingUsageError,
      );
    }

    if (existingUsage) {
      return NextResponse.json({ success: true, message: '이미 초대 코드를 인증했습니다' });
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('allowed_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserError) {
      return withServerError(
        '사용자 화이트리스트를 확인하지 못했습니다. 관리자에게 문의하세요.',
        'failed to fetch existing user',
        existingUserError,
      );
    }

    const requesterIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || null;

    if (existingUser) {
      console.log('[verify-code] User already in allowed_users, adding usage record');
      const { error: usageInsertError } = await supabaseAdmin.from('invite_code_usage').insert({
        code,
        user_email: email,
        user_name: name,
        ip_address: requesterIp,
      });

      if (usageInsertError) {
        return withServerError(
          '초대 코드 사용 기록을 저장하지 못했습니다.',
          'failed to insert invite code usage for existing user',
          usageInsertError,
        );
      }

      const { error: usageCountError } = await supabaseAdmin
        .from('invite_codes')
        .update({ used_count: inviteCode.used_count + 1 })
        .eq('code', code);

      if (usageCountError) {
        console.error('[verify-code] failed to update invite code usage count', usageCountError);
      }

      console.log('[verify-code] ✓ Existing user verified successfully');
      return NextResponse.json({ success: true, message: '이미 초대 코드를 인증했습니다' });
    }

    console.log('[verify-code] Creating new allowed user');
    const { error: insertUserError } = await supabaseAdmin.from('allowed_users').insert({
      email,
      name,
      invited_by: code,
    });

    if (insertUserError) {
      return withServerError(
        '사용자 정보를 저장하지 못했습니다.',
        'failed to insert allowed user',
        insertUserError,
      );
    }

    const { error: usageInsertError } = await supabaseAdmin.from('invite_code_usage').insert({
      code,
      user_email: email,
      user_name: name,
      ip_address: requesterIp,
    });

    if (usageInsertError) {
      console.error('[verify-code] failed to insert invite code usage for new user', usageInsertError);
    }

    const { error: usageCountError } = await supabaseAdmin
      .from('invite_codes')
      .update({ used_count: inviteCode.used_count + 1 })
      .eq('code', code);

    if (usageCountError) {
      console.error('[verify-code] failed to update invite code usage count', usageCountError);
    }

    console.log('[verify-code] ✓ New user verified successfully');
    return NextResponse.json({ success: true, message: '초대 코드가 인증되었습니다' });
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
