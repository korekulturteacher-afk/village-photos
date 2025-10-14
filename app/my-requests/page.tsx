'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  const [requests, setRequests] = useState<DownloadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

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

        alert('다운로드가 완료되었습니다');
      } else {
        const data = await response.json();
        alert(data.error || '다운로드에 실패했습니다');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('다운로드 중 오류가 발생했습니다');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: '대기중',
      approved: '승인됨',
      rejected: '거절됨',
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
          <p className="text-gray-600">로딩 중...</p>
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📥 내 다운로드 요청
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                총 {requests.length}건의 요청
              </p>
            </div>
            <button
              onClick={() => router.push('/gallery')}
              className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition flex items-center gap-2"
            >
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>갤러리로 돌아가기</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">아직 다운로드 요청이 없습니다</p>
            <button
              onClick={() => router.push('/gallery')}
              className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              갤러리로 이동
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
                        {new Date(request.requested_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-gray-700">
                      <span className="font-medium">사진 수:</span> {request.photo_ids.length}장
                    </p>
                    {request.reason && (
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium">신청 사유:</span> {request.reason}
                      </p>
                    )}
                    {request.downloaded_at && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {new Date(request.downloaded_at).toLocaleString('ko-KR')}에 다운로드 완료
                      </p>
                    )}
                  </div>

                  {request.status === 'approved' && (
                    <button
                      onClick={() => handleDownload(request.id)}
                      disabled={downloading === request.id}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {downloading === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                          <span>다운로드</span>
                        </>
                      )}
                    </button>
                  )}

                  {request.status === 'rejected' && (
                    <div className="text-red-600 font-medium">
                      거절됨
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="text-yellow-600 font-medium">
                      검토 대기중
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
