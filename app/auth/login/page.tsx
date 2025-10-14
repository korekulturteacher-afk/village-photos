'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (status === 'authenticated') {
      // If user is already allowed (has verified invite code before), go to gallery
      if (session?.user?.isAllowed) {
        router.push('/gallery');
      } else {
        // If not allowed yet, go to verify page to enter invite code
        if (code) {
          router.push(`/auth/verify?code=${code}`);
        } else {
          router.push('/auth/verify');
        }
      }
    }
  }, [status, session, code, router]);

  const handleGoogleLogin = async () => {
    // Store invite code if provided
    if (code) {
      sessionStorage.setItem('invite_code', code);
    }

    // After login, the system will check if user is in allowed_users
    // If yes: redirect to gallery
    // If no: redirect to verify page
    await signIn('google', { callbackUrl: '/auth/verify' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏘️ 마을 사진 갤러리
          </h1>
          <p className="text-gray-600">
            초대받으신 것을 환영합니다
          </p>
        </div>

        {code && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              ✅ <span className="font-semibold">초대 코드 적용됨:</span> <span className="font-mono">{code}</span>
            </p>
            <p className="text-xs text-green-700 mt-1">
              로그인 후 자동으로 초대 코드가 입력됩니다
            </p>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 로그인
        </button>

        {!code && (
          <p className="mt-6 text-center text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            💡 초대 코드가 없으신가요?<br />
            로그인 후 초대 코드를 입력하실 수 있습니다
          </p>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          구글 계정으로 로그인하여<br />
          마을 사진을 확인하세요
        </p>
      </div>
    </div>
  );
}
