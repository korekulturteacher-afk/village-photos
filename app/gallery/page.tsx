'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Photo } from '@/lib/google-drive';
import PhotoGrid from '@/components/PhotoGrid';
import PhotoModal from '@/components/PhotoModal';
import DownloadRequestModal from '@/components/DownloadRequestModal';

export default function GalleryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [modalPhoto, setModalPhoto] = useState<Photo | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch('/api/photos');
        const data = await response.json();

        if (data.success) {
          setPhotos(data.photos);
        }
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchPhotos();
    }
  }, [status]);

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleRequestDownload = async (reason: string) => {
    if (selectedPhotos.size === 0) return;

    try {
      const response = await fetch('/api/download-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds: Array.from(selectedPhotos),
          reason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || '다운로드 신청이 완료되었습니다');
        setSelectedPhotos(new Set());
        setShowRequestModal(false);
      } else {
        alert(data.error || '신청에 실패했습니다');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">사진 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🏘️ 마을 사진 갤러리
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                총 {photos.length}장의 사진
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/my-requests')}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                내 신청 내역
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600">{session?.user?.name}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PhotoGrid
          photos={photos}
          selectedPhotos={selectedPhotos}
          onPhotoClick={setModalPhoto}
          onPhotoSelect={togglePhotoSelection}
        />
      </main>

      {/* Photo Modal */}
      {modalPhoto && (
        <PhotoModal
          photo={modalPhoto}
          photos={photos}
          isSelected={selectedPhotos.has(modalPhoto.id)}
          onClose={() => setModalPhoto(null)}
          onToggleSelect={() => togglePhotoSelection(modalPhoto.id)}
          onNavigate={setModalPhoto}
        />
      )}

      {/* Download Request Modal */}
      {showRequestModal && (
        <DownloadRequestModal
          selectedCount={selectedPhotos.size}
          onSubmit={handleRequestDownload}
          onClose={() => setShowRequestModal(false)}
        />
      )}

      {/* Floating Action Button */}
      {selectedPhotos.size > 0 && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-indigo-600 text-white px-6 py-4 rounded-full shadow-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <span className="font-semibold">
              선택한 사진 신청 ({selectedPhotos.size}장)
            </span>
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
