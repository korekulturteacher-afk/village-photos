import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
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

    const { requestId } = await params;

    // Get the download request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('download_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (request.status !== 'approved') {
      return NextResponse.json(
        { error: '승인되지 않은 요청입니다' },
        { status: 403 }
      );
    }

    // Create download link
    const downloadLink = `${process.env.NEXT_PUBLIC_APP_URL}/download/${requestId}`;
    const userName = request.user_name || request.user_email.split('@')[0];
    const photoCount = request.photo_ids.length;

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Village Photos <onboarding@resend.dev>',
      to: [request.user_email],
      subject: '[마을 사진첩] 사진 다운로드 링크',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 20px;
              }
              .header {
                background-color: #4f46e5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                padding: 30px 20px;
              }
              .button {
                display: inline-block;
                padding: 14px 28px;
                background-color: #4f46e5;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
              }
              .info-box {
                background-color: #f9fafb;
                border-left: 4px solid #4f46e5;
                padding: 15px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #6b7280;
                font-size: 14px;
                border-top: 1px solid #e5e7eb;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">마을 사진첩</h1>
              </div>

              <div class="content">
                <p>안녕하세요, ${userName}님!</p>

                <p>요청하신 사진 다운로드가 승인되었습니다. 아래 버튼을 클릭하여 사진을 다운로드하실 수 있습니다.</p>

                <div class="info-box">
                  <p style="margin: 5px 0;"><strong>승인된 사진 수:</strong> ${photoCount}장</p>
                  <p style="margin: 5px 0;"><strong>요청 날짜:</strong> ${new Date(request.requested_at).toLocaleString('ko-KR')}</p>
                </div>

                <div style="text-align: center;">
                  <a href="${downloadLink}" class="button">사진 다운로드하기</a>
                </div>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  <strong>안내사항:</strong><br>
                  • 링크를 클릭하면 로그인 후 다운로드 페이지로 이동합니다.<br>
                  • 개별 사진 다운로드 또는 전체 ZIP 파일 다운로드를 선택하실 수 있습니다.<br>
                  • 문제가 있으시면 관리자에게 문의해 주세요.
                </p>
              </div>

              <div class="footer">
                <p>이 이메일은 마을 사진첩에서 자동으로 발송되었습니다.</p>
                <p>© 2025 마을 사진첩. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Send Download Email] Error sending email:', error);
      return NextResponse.json(
        { error: '이메일 전송 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    console.log('[Send Download Email] Email sent successfully:', data);

    return NextResponse.json({
      success: true,
      message: '이메일이 성공적으로 전송되었습니다',
      data,
    });
  } catch (error) {
    console.error('[Send Download Email] Error:', error);
    return NextResponse.json(
      { error: '이메일 전송 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
