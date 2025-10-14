'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');
  
  const [code, setCode] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      if (session.user.isAllowed) {
        router.replace('/gallery');
        return;
      }
      
      const savedCode = sessionStorage.getItem('invite_code');
      if (savedCode && !code) {
        setCode(savedCode);
      }
      
      setChecking(false);
    }
  }, [status, session, router, code]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('초대 코드를 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          email: session?.user?.email,
          name: session?.user?.name,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('인증 성공! 갤러리로 이동합니다...');
        sessionStorage.removeItem('invite_code');

        // Force page reload to update session
        setTimeout(() => {
          window.location.href = '/gallery';
        }, 1000);
      } else {
        setError(data.error || '인증에 실패했습니다');
      }
    } catch (err) {
      console.error('Verify error:', err);
      setError('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (checking || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">확인 중...</p>
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
            초대 코드를 입력해주세요
          </p>
        </div>

        {session?.user && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              로그인: <span className="font-medium">{session.user.email}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              초대 코드
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: VILLAGE2025"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg font-mono text-gray-900 placeholder-gray-400"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '확인 중...' : '확인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            초대 코드가 없으신가요?
          </p>
          <p className="text-xs text-gray-400 mt-1">
            관리자에게 문의해주세요
          </p>
        </div>
      </div>
    </div>
  );
}
