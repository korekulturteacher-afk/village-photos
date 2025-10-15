'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Photo } from '@/lib/google-drive';
import PhotoGrid from '@/components/PhotoGrid';
import PhotoModal from '@/components/PhotoModal';
import DownloadRequestModal from '@/components/DownloadRequestModal';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslations } from '@/lib/i18n';

export default function GalleryPage() {
  const { t } = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [modalPhoto, setModalPhoto] = useState<Photo | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

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
    const fetchPhotos = async () => {
      try {
        const response = await fetch('/api/photos');
        const data = await response.json();

        if (data.success) {
          setPhotos(data.photos);
        }
      } catch (error) {
        console.error('[Gallery] Error fetching photos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

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

  const handleRequestDownload = async (data: { name: string; phone: string; reason: string }) => {
    if (selectedPhotos.size === 0) return;

    try {
      const response = await fetch('/api/download-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds: Array.from(selectedPhotos),
          name: data.name,
          phone: data.phone,
          reason: data.reason,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        alert(responseData.message || t('modal.downloadRequest.successMessage'));
        setSelectedPhotos(new Set());
        setShowRequestModal(false);
      } else {
        alert(responseData.error || t('modal.downloadRequest.errorMessage'));
      }
    } catch {
      alert(t('modal.downloadRequest.errorMessage'));
    }
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
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('gallery.title')}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('gallery.totalPhotos', { count: photos.length })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center text-sm text-gray-600 mr-2">
                {session?.user?.email}
              </div>
              <LanguageSelector />
              <button
                onClick={() => router.push('/my-requests')}
                className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition flex items-center gap-2"
                title={t('gallery.myRequests')}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="hidden sm:inline">{t('gallery.myRequests')}</span>
              </button>
              <button
                onClick={() => window.location.href = '/admin'}
                className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition flex items-center gap-2"
                title={t('common.admin')}
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="hidden sm:inline">{t('common.admin')}</span>
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition flex items-center gap-2"
                title={t('common.logout')}
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

      {/* Floating Action Button - only show on main page, not in modal */}
      {selectedPhotos.size > 0 && !modalPhoto && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-indigo-600 text-white px-6 py-4 rounded-full shadow-lg hover:bg-indigo-700 transition flex items-center gap-3"
          >
            <span className="font-semibold">
              {t('gallery.requestDownload')} ({t('gallery.selectedCount', { count: selectedPhotos.size })})
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
