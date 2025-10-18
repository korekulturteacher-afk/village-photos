'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import LanguageSelector from '@/components/LanguageSelector';

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [inviteCode, setInviteCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // Check if user already has valid invite code
  useEffect(() => {
    const storedCode = localStorage.getItem('inviteCode');
    if (storedCode) {
      // Verify the code is still valid
      verifyAndRedirect(storedCode);
    }
  }, []);

  const verifyAndRedirect = async (code: string) => {
    try {
      const response = await fetch('/api/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('inviteCode', code);
        router.push('/gallery');
      } else {
        // Invalid code, clear storage
        localStorage.removeItem('inviteCode');
        setError(data.error || t('auth.verifyCode.errorMessage'));
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(t('auth.verifyCode.errorServer'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      setError(t('auth.verifyCode.errorRequired'));
      return;
    }

    setIsVerifying(true);
    setError('');

    await verifyAndRedirect(inviteCode.trim().toUpperCase());
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      {/* Language Selector - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <LanguageSelector variant="dark" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            {t('common.appName')}
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {t('auth.verifyCode.subtitle')}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.verifyCode.codeLabel')}
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder={t('auth.verifyCode.codePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-center text-lg font-mono tracking-wider uppercase"
                disabled={isVerifying}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('auth.verifyCode.verifying')}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span>{t('auth.verifyCode.verifyButton')}</span>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t('auth.verifyCode.noCode')}
            </p>
            <p className="text-sm text-gray-600 font-medium mt-1">
              {t('auth.verifyCode.contactAdmin')}
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-white text-sm opacity-90 mb-1">
            İskenderun Kore Mahallesi
          </p>
          <p className="text-white text-xs opacity-75">
            Kore Kültür Merkezi
          </p>
        </div>
      </div>
    </div>
  );
}
