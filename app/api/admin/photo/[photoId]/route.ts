import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const password = authHeader?.replace('Bearer ', '');

    if (!password) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Verify admin password
    const adminPasswordResponse = await fetch(
      `${req.nextUrl.origin}/api/admin/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }
    );

    if (!adminPasswordResponse.ok) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const { photoId } = await params;

    // Get photo details from database
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json(
        { error: '사진을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error('[Admin Photo] Error getting photo:', error);
    return NextResponse.json(
      { error: '사진 정보를 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
