import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError, ApiSuccess, validateRequired, logError } from '@/lib/api-utils';
import type { InviteCode } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, email, name } = body;

    // Validate required fields
    const validation = validateRequired(body, ['code', 'email']);
    if (!validation.valid) return validation.error!;

    // Fetch invite code
    const { data: inviteCode, error: inviteCodeError } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (inviteCodeError) {
      logError('verify-code: fetch invite code', inviteCodeError);
      return ApiError.serverError('초대 코드 정보를 불러오지 못했습니다');
    }

    if (!inviteCode) {
      return ApiError.badRequest('유효하지 않은 초대 코드입니다');
    }

    // Validate invite code
    const codeData = inviteCode as InviteCode;

    if (!codeData.is_active) {
      return ApiError.badRequest('비활성화된 초대 코드입니다');
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return ApiError.badRequest('만료된 초대 코드입니다');
    }

    if (codeData.max_uses && codeData.used_count >= codeData.max_uses) {
      return ApiError.badRequest('초대 코드 사용 가능 횟수를 초과했습니다');
    }

    // Check if user already used this code
    const { data: existingUsage, error: usageCheckError } = await supabaseAdmin
      .from('invite_code_usage')
      .select('id')
      .eq('code', code)
      .eq('user_email', email)
      .maybeSingle();

    if (usageCheckError) {
      logError('verify-code: check usage', usageCheckError);
      return ApiError.serverError('초대 코드 사용 내역을 확인하지 못했습니다');
    }

    // Check if user is already in allowed_users
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('allowed_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userCheckError) {
      logError('verify-code: check user', userCheckError);
      return ApiError.serverError('사용자 정보를 확인하지 못했습니다');
    }

    const requesterIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        req.headers.get('x-real-ip') ||
                        null;

    // If user exists and has used the code, return success
    if (existingUsage) {
      return ApiSuccess.ok({ message: '이미 초대 코드를 인증했습니다' });
    }

    // Record usage
    const { error: usageInsertError } = await supabaseAdmin
      .from('invite_code_usage')
      .insert({
        code,
        user_email: email,
        user_name: name,
        ip_address: requesterIp,
      });

    if (usageInsertError) {
      logError('verify-code: insert usage', usageInsertError);
      return ApiError.serverError('초대 코드 사용 기록을 저장하지 못했습니다');
    }

    // If user doesn't exist, add to allowed_users
    if (!existingUser) {
      const { error: insertUserError } = await supabaseAdmin
        .from('allowed_users')
        .insert({
          email,
          name,
          invited_by: code,
        });

      if (insertUserError) {
        logError('verify-code: insert user', insertUserError);
        return ApiError.serverError('사용자 정보를 저장하지 못했습니다');
      }
    }

    // Update usage count
    await supabaseAdmin
      .from('invite_codes')
      .update({ used_count: codeData.used_count + 1 })
      .eq('code', code);

    return ApiSuccess.ok({
      message: existingUser ? '초대 코드가 확인되었습니다' : '초대 코드가 인증되었습니다',
    });
  } catch (error) {
    logError('verify-code', error);
    return ApiError.serverError();
  }
}
