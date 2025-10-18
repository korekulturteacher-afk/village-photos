import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Check if invite code exists and is active
    const { data: inviteCode, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !inviteCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive invite code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      code: inviteCode.code,
    });
  } catch (error) {
    console.error('[API] Verify invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
