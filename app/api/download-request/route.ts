import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { photoIds, reason } = await req.json();

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: '사진을 선택해주세요' },
        { status: 400 }
      );
    }

    // Check rate limits
    const { data: rateLimit } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('user_email', session.user.email)
      .single();

    if (rateLimit) {
      const resetTime = new Date(rateLimit.reset_at);
      if (resetTime > new Date()) {
        if (rateLimit.request_count >= 3) {
          return NextResponse.json(
            { error: '시간당 신청 횟수를 초과했습니다' },
            { status: 429 }
          );
        }
      } else {
        // Reset rate limit
        await supabaseAdmin
          .from('rate_limits')
          .update({
            request_count: 0,
            reset_at: new Date(Date.now() + 3600000), // 1 hour
          })
          .eq('user_email', session.user.email);
      }
    }

    // Check for pending requests
    const { data: pendingRequests } = await supabaseAdmin
      .from('download_requests')
      .select('id')
      .eq('user_email', session.user.email)
      .eq('status', 'pending');

    if (pendingRequests && pendingRequests.length >= 3) {
      return NextResponse.json(
        { error: '대기 중인 신청이 3건을 초과했습니다' },
        { status: 400 }
      );
    }

    // Create download request
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('download_requests')
      .insert({
        user_email: session.user.email,
        user_name: session.user.name,
        photo_ids: photoIds,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating request:', insertError);
      return NextResponse.json(
        { error: '신청 생성 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // Update or create rate limit
    if (rateLimit) {
      await supabaseAdmin
        .from('rate_limits')
        .update({
          request_count: rateLimit.request_count + 1,
        })
        .eq('user_email', session.user.email);
    } else {
      await supabaseAdmin.from('rate_limits').insert({
        user_email: session.user.email,
        request_count: 1,
        reset_at: new Date(Date.now() + 3600000),
      });
    }

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: '다운로드 신청이 완료되었습니다',
    });
  } catch (error) {
    console.error('Error creating download request:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Get user's download requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: requests, error } = await supabaseAdmin
      .from('download_requests')
      .select('*')
      .eq('user_email', session.user.email)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return NextResponse.json(
        { error: '신청 내역을 가져오는 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Error fetching download requests:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
