import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    if (!session.user.isAllowed) {
      return NextResponse.json({ error: '회원 권한이 필요합니다' }, { status: 403 });
    }

    const { requestId } = await params;

    // Get the download request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('download_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_email', session.user.email)
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error('[Get Download Request] Error:', error);
    return NextResponse.json(
      { error: '요청을 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
