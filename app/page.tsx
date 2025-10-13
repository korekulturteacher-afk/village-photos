'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      // Redirect to login with invite code
      router.push(`/auth/login?code=${code}`);
    }
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🏘️ 마을 사진 갤러리
        </h1>
        <p className="text-gray-600 mb-6">
          초대 코드가 필요합니다
        </p>

        {!code && (
          <div className="text-left bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              초대 링크를 받지 못하셨나요?
            </p>
            <p className="text-sm text-gray-500">
              관리자에게 WhatsApp 초대 링크를 요청하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
