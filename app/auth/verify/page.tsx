'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useTranslations } from '@/lib/i18n';
import LanguageSelector from '@/components/LanguageSelector';

function VerifyPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');
  const { t } = useTranslations();

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

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!code.trim()) {
      setError(t('auth.verifyCode.errorRequired'));
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
        setSuccess(t('auth.verifyCode.successMessage'));
        sessionStorage.removeItem('invite_code');

        // Force page reload to update session
        setTimeout(() => {
          window.location.href = '/gallery';
        }, 1000);
      } else {
        setError(data.error || t('auth.verifyCode.errorMessage'));
      }
    } catch (err) {
      console.error('Verify error:', err);
      setError(t('auth.verifyCode.errorServer'));
    } finally {
      setLoading(false);
    }
  };

  if (checking || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('common.appName')}
          </h1>
          <p className="text-gray-600">
            {t('auth.verifyCode.subtitle')}
          </p>
        </div>

        {session?.user && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {t('auth.verifyCode.loggedInAs')}: <span className="font-medium">{session.user.email}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.verifyCode.codeLabel')}
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('auth.verifyCode.codePlaceholder')}
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
            {loading ? t('auth.verifyCode.verifying') : t('auth.verifyCode.verifyButton')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {t('auth.verifyCode.noCode')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {t('auth.verifyCode.contactAdmin')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
