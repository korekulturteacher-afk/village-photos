import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Get download requests with status filter
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    let query = supabase
      .from('download_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Admin Download Requests API] Error:', error);
      return NextResponse.json(
        { success: false, error: '다운로드 요청을 불러올 수 없습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: data || [],
    });
  } catch (error) {
    console.error('[Admin Download Requests API] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requestId, action, adminNote } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 작업입니다' },
        { status: 400 }
      );
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const reviewedAt = new Date().toISOString();

    // Update download request status
    const { data, error } = await supabase
      .from('download_requests')
      .update({
        status,
        admin_note: adminNote || null,
        reviewed_at: reviewedAt,
        reviewed_by: 'admin',
        download_expires_at: action === 'approve'
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          : null,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[Admin Download Requests API] Error updating:', error);
      return NextResponse.json(
        { success: false, error: '요청 처리에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? '요청이 승인되었습니다' : '요청이 거부되었습니다',
      request: data,
    });
  } catch (error) {
    console.error('[Admin Download Requests API] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
