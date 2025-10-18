'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import LanguageSelector from '@/components/LanguageSelector';

interface DownloadRequest {
  id: string;
  user_email: string;
  user_name: string;
  user_phone: string;
  photo_ids: string[];
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  downloaded_at: string | null;
}

export default function MyRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslations();
  const [requests, setRequests] = useState<DownloadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated' && !session?.user?.isAllowed) {
      router.push('/auth/verify');
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/download-request');
        const data = await response.json();

        if (data.success) {
          setRequests(data.requests);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isAllowed) {
      fetchRequests();
    }
  }, [session]);

  const handleDownload = async (requestId: string) => {
    setDownloading(requestId);

    try {
      const response = await fetch(`/api/download/${requestId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photos-${requestId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Refresh requests to update downloaded_at
        const refreshResponse = await fetch('/api/download-request');
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setRequests(refreshData.requests);
        }

        alert(t('requests.downloadSuccess'));
      } else {
        const data = await response.json();
        alert(data.error || t('requests.downloadError'));
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(t('requests.downloadErrorGeneric'));
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPhoto = async (requestId: string, photoId: string) => {
    setDownloadingPhoto(photoId);

    try {
      const response = await fetch(`/api/download-photo/${requestId}/${photoId}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `photo-${photoId}.jpg`;
        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
            filename = decodeURIComponent(filename);
          }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.error || t('requests.downloadError'));
      }
    } catch (error) {
      console.error('Download photo error:', error);
      alert(t('requests.downloadErrorGeneric'));
    } finally {
      setDownloadingPhoto(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: t('requests.status.pending'),
      approved: t('requests.status.approved'),
      rejected: t('requests.status.rejected'),
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                {t('requests.title')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-0.5 sm:mt-1">
                {t('requests.totalCount', { count: requests.length })}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 ml-2">
              <div className="hidden md:flex items-center text-xs sm:text-sm text-gray-300 mr-1 sm:mr-2 truncate max-w-[150px]">
                {session?.user?.email}
              </div>
              <LanguageSelector />
              <button
                onClick={() => router.push('/gallery')}
                className="px-3 sm:px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span className="hidden sm:inline">{t('requests.backToGallery')}</span>
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-3 sm:px-4 py-2 text-red-400 hover:text-white hover:bg-red-600 rounded transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                title={t('common.logout')}
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">
              <svg
                className="w-24 h-24 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 text-lg">{t('requests.noRequests')}</p>
            <button
              onClick={() => router.push('/gallery')}
              className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              {t('requests.goToGallery')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(request.status)}
                      <span className="text-sm text-gray-500">
                        {new Date(request.requested_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700">
                      <span className="font-medium">{t('requests.photoCount', { count: request.photo_ids.length })}</span>
                    </p>
                    {request.reason && (
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium">{t('requests.reason')}:</span> {request.reason}
                      </p>
                    )}
                    {request.downloaded_at && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {t('requests.downloadedAt', { date: new Date(request.downloaded_at).toLocaleString() })}
                      </p>
                    )}
                  </div>

                  {request.status === 'rejected' && (
                    <div className="text-red-600 font-medium">
                      {t('requests.status.rejected')}
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="text-yellow-600 font-medium">
                      {t('requests.pendingReview')}
                    </div>
                  )}
                </div>

                {/* Photo grid for approved requests */}
                {request.status === 'approved' && request.photo_ids.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      사진 목록 (개별 다운로드 가능)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {request.photo_ids.map((photoId) => (
                        <div
                          key={photoId}
                          className="relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-300"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://drive.google.com/thumbnail?id=${photoId}&sz=w400`}
                            alt="Photo"
                            className="w-full h-full object-contain"
                            style={{ display: 'block' }}
                            loading="lazy"
                            onError={(e) => {
                              console.error('Image load error for:', photoId);
                              const img = e.target as HTMLImageElement;
                              // Try fallback to our API
                              if (!img.src.includes('/api/admin/thumbnail')) {
                                img.src = `/api/admin/thumbnail/${photoId}`;
                              } else {
                                img.style.display = 'none';
                                const parent = img.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">이미지 로드 실패</div>`;
                                }
                              }
                            }}
                            onLoad={(e) => {
                              const img = e.target as HTMLImageElement;
                              // Force visibility
                              img.style.opacity = '1';
                              img.style.visibility = 'visible';
                            }}
                          />
                          <button
                            onClick={() => handleDownloadPhoto(request.id, photoId)}
                            disabled={downloadingPhoto === photoId}
                            className="absolute bottom-2 right-2 px-3 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-lg"
                            title="다운로드"
                          >
                            {downloadingPhoto === photoId ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                                <span className="hidden sm:inline">다운로드</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
