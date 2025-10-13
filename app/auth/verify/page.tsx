'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyCode = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      if (status === 'authenticated' && session?.user) {
        const code = sessionStorage.getItem('invite_code');

        if (!code) {
          setError('초대 코드를 찾을 수 없습니다');
          setVerifying(false);
          return;
        }

        try {
          const response = await fetch('/api/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              email: session.user.email,
              name: session.user.name,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            sessionStorage.removeItem('invite_code');
            router.push('/gallery');
          } else {
            setError(data.error || '인증에 실패했습니다');
            setVerifying(false);
          }
        } catch (err) {
          setError('서버 오류가 발생했습니다');
          setVerifying(false);
        }
      }
    };

    verifyCode();
  }, [status, session, router]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">초대 코드 확인 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              인증 실패
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              처음으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
