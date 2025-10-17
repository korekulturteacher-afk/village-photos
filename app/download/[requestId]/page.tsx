'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

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

export default function DownloadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;

  const [request, setRequest] = useState<DownloadRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      // Redirect to login with callback
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(`/download/${requestId}`)}`);
      return;
    }

    if (status === 'authenticated' && !session?.user?.isAllowed) {
      router.push('/auth/verify');
      return;
    }
  }, [status, session, router, requestId]);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!session?.user?.isAllowed) return;

      try {
        const response = await fetch(`/api/download-request/${requestId}`);
        const data = await response.json();

        if (data.success) {
          // Verify the request belongs to the current user
          if (data.request.user_email !== session.user.email) {
            setError('이 다운로드 링크에 접근할 권한이 없습니다.');
            return;
          }

          if (data.request.status !== 'approved') {
            setError('아직 승인되지 않은 요청입니다.');
            return;
          }

          setRequest(data.request);
        } else {
          setError(data.error || '요청을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        setError('요청을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isAllowed) {
      fetchRequest();
    }
  }, [session, requestId]);

  const handleDownloadAll = async () => {
    if (!request) return;

    setDownloading(true);

    try {
      const response = await fetch(`/api/download/${request.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photos-${request.id}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('다운로드가 완료되었습니다!');
      } else {
        const data = await response.json();
        alert(data.error || '다운로드 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPhoto = async (photoId: string) => {
    if (!request) return;

    setDownloadingPhoto(photoId);

    try {
      const response = await fetch(`/api/download-photo/${request.id}/${photoId}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Get filename from Content-Disposition header
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
        alert(data.error || '다운로드 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Download photo error:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingPhoto(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAllowed) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">오류</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/gallery')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              갤러리로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">사진 다운로드</h1>
            <button
              onClick={() => router.push('/gallery')}
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition"
            >
              갤러리로 돌아가기
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                승인된 사진 다운로드
              </h2>
              <p className="text-gray-600">
                총 {request.photo_ids.length}장의 사진이 승인되었습니다.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                요청일: {new Date(request.requested_at).toLocaleString('ko-KR')}
              </p>
            </div>

            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>다운로드 중...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
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
                  <span>전체 다운로드 (ZIP)</span>
                </>
              )}
            </button>
          </div>

          {request.reason && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">요청 사유:</span> {request.reason}
              </p>
            </div>
          )}
        </div>

        {/* Photo Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            사진 목록 (개별 다운로드 가능)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {request.photo_ids.map((photoId) => (
              <div
                key={photoId}
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
              >
                <img
                  src={`https://drive.google.com/thumbnail?id=${photoId}&sz=w300`}
                  alt="Photo"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  <button
                    onClick={() => handleDownloadPhoto(photoId)}
                    disabled={downloadingPhoto === photoId}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
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
                        <span>다운로드</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
