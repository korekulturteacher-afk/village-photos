import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ApiError,
  ApiSuccess,
  requireAllowedUser,
  validateRequired,
  logError,
} from '@/lib/api-utils';
import type { RateLimit } from '@/types/database';

const MAX_PENDING_REQUESTS = 3;
const MAX_REQUESTS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour

async function checkRateLimit(userEmail: string): Promise<boolean> {
  const { data: rateLimit } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('user_email', userEmail)
    .maybeSingle();

  if (!rateLimit) return true;

  const resetTime = new Date((rateLimit as RateLimit).reset_at);
  const now = new Date();

  if (resetTime > now) {
    return (rateLimit as RateLimit).request_count < MAX_REQUESTS_PER_HOUR;
  }

  // Reset expired rate limit
  await supabaseAdmin
    .from('rate_limits')
    .update({
      request_count: 0,
      reset_at: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString(),
    })
    .eq('user_email', userEmail);

  return true;
}

async function updateRateLimit(userEmail: string) {
  const { data: rateLimit } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('user_email', userEmail)
    .maybeSingle();

  if (rateLimit) {
    await supabaseAdmin
      .from('rate_limits')
      .update({
        request_count: (rateLimit as RateLimit).request_count + 1,
      })
      .eq('user_email', userEmail);
  } else {
    await supabaseAdmin.from('rate_limits').insert({
      user_email: userEmail,
      request_count: 1,
      reset_at: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString(),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error: authError } = await requireAllowedUser();
    if (authError) return authError;

    const body = await req.json();
    const { photoIds, name, phone, reason } = body;

    // Validate required fields
    const validation = validateRequired(body, ['photoIds', 'name', 'phone']);
    if (!validation.valid) return validation.error!;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return ApiError.badRequest('사진을 선택해주세요');
    }

    const userEmail = session.user!.email!;

    // Check rate limits
    const canMakeRequest = await checkRateLimit(userEmail);
    if (!canMakeRequest) {
      return ApiError.badRequest('시간당 요청 횟수를 초과했습니다');
    }

    // Check pending requests
    const { data: pendingRequests } = await supabaseAdmin
      .from('download_requests')
      .select('id')
      .eq('user_email', userEmail)
      .eq('status', 'pending');

    if (pendingRequests && pendingRequests.length >= MAX_PENDING_REQUESTS) {
      return ApiError.badRequest(`대기 중인 요청이 ${MAX_PENDING_REQUESTS}개를 초과했습니다`);
    }

    // Create download request
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('download_requests')
      .insert({
        user_email: userEmail,
        user_name: name.trim(),
        user_phone: phone.trim(),
        photo_ids: photoIds,
        reason: reason?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      logError('download-request: create', insertError);
      return ApiError.serverError('요청 생성 중 오류가 발생했습니다');
    }

    // Update rate limit
    await updateRateLimit(userEmail);

    return ApiSuccess.created({
      request: newRequest,
      message: '다운로드 요청이 완료되었습니다',
    });
  } catch (error) {
    logError('download-request: POST', error);
    return ApiError.serverError();
  }
}

export async function GET() {
  try {
    const { session, error: authError } = await requireAllowedUser();
    if (authError) return authError;

    const { data: requests, error } = await supabaseAdmin
      .from('download_requests')
      .select('*')
      .eq('user_email', session.user!.email!)
      .order('requested_at', { ascending: false });

    if (error) {
      logError('download-request: GET', error);
      return ApiError.serverError('요청 목록을 가져오는 중 오류가 발생했습니다');
    }

    return ApiSuccess.ok({ requests });
  } catch (error) {
    logError('download-request: GET', error);
    return ApiError.serverError();
  }
}
