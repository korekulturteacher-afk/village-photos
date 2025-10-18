'use client';

import { Photo } from '@/lib/google-drive';
import { useEffect, useState } from 'react';
import { getGoogleDriveDirectLink, getApiFallbackUrl } from '@/lib/google-drive-urls';
import { useTranslations } from '@/lib/i18n';

interface PhotoModalProps {
  photo: Photo;
  photos: Photo[];
  isSelected: boolean;
  onClose: () => void;
  onToggleSelect: () => void;
  onNavigate: (photo: Photo) => void;
}

export default function PhotoModal({
  photo,
  photos,
  isSelected,
  onClose,
  onToggleSelect,
  onNavigate,
}: PhotoModalProps) {
  const { t } = useTranslations();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(() => getGoogleDriveDirectLink(photo.id));
  const [useFallback, setUseFallback] = useState(false);

  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  // 고해상도 이미지 URL 생성 (모달용 큰 이미지)
  // Google Drive 직접 링크 사용 (빠른 로딩, 타임아웃 없음)
  const getHighResImage = (photo: Photo) => {
    return useFallback
      ? getApiFallbackUrl(photo.id, 'image')
      : getGoogleDriveDirectLink(photo.id);
  };

  // Reset loading state and image source when photo changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setUseFallback(false);
    setImageSrc(getGoogleDriveDirectLink(photo.id));
  }, [photo.id]);

  // Preload adjacent images for faster navigation
  useEffect(() => {
    const preloadImages: string[] = [];

    // Preload previous image
    if (hasPrev) {
      preloadImages.push(getHighResImage(photos[currentIndex - 1]));
    }

    // Preload next image
    if (hasNext) {
      preloadImages.push(getHighResImage(photos[currentIndex + 1]));
    }

    // Preload next 2 images
    if (currentIndex + 2 < photos.length) {
      preloadImages.push(getHighResImage(photos[currentIndex + 2]));
    }

    // Create link elements for preloading
    preloadImages.forEach((src) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });

    return () => {
      // Cleanup preload links
      document.querySelectorAll('link[rel="prefetch"][as="image"]').forEach((link) => {
        if (preloadImages.includes(link.getAttribute('href') || '')) {
          link.remove();
        }
      });
    };
  }, [currentIndex, photos, hasPrev, hasNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) {
        onNavigate(photos[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight' && hasNext) {
        onNavigate(photos[currentIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrev, hasNext, photos, onClose, onNavigate]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-50"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Previous Button */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(photos[currentIndex - 1])}
          className="absolute left-4 text-white hover:text-gray-300 transition z-50"
        >
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Next Button */}
      {hasNext && (
        <button
          onClick={() => onNavigate(photos[currentIndex + 1])}
          className="absolute right-4 text-white hover:text-gray-300 transition z-50"
        >
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Photo */}
      <div className="max-w-6xl max-h-[90vh] w-full px-4">
        <div className="relative min-h-[400px] flex items-center justify-center">
          {/* Loading Skeleton with shimmer effect */}
          {imageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full min-h-[400px] bg-gray-800 rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700 to-transparent animate-shimmer" />
              </div>
              <div className="absolute animate-spin rounded-full h-16 w-16 border-b-2 border-white" />
            </div>
          )}

          {/* Error Message */}
          {imageError && (
            <div className="w-full h-96 bg-gray-800 flex flex-col items-center justify-center rounded-lg">
              <svg
                className="w-16 h-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-white text-lg">{t('common.error')}</p>
            </div>
          )}

          {/* Image */}
          {!imageError && (
            <img
              src={imageSrc}
              alt={photo.name}
              className={`w-full h-auto max-h-[80vh] object-contain mx-auto transition-opacity duration-500 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => {
                setImageLoading(false);
              }}
              onError={() => {
                // Try API fallback if direct link fails
                if (!useFallback) {
                  setUseFallback(true);
                  setImageSrc(getApiFallbackUrl(photo.id, 'image'));
                } else {
                  setImageError(true);
                  setImageLoading(false);
                }
              }}
              loading="eager"
              decoding="async"
            />
          )}
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .animate-shimmer {
            animation: shimmer 1.5s ease-in-out infinite;
          }
        `}</style>

        {/* Info Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-900 bg-opacity-50 rounded-lg p-4">
          <div className="text-white flex-1 min-w-0">
            <p className="font-medium truncate">{photo.name}</p>
            <p className="text-sm text-gray-300 mt-1">
              {currentIndex + 1} / {photos.length}
            </p>
          </div>

          <button
            onClick={onToggleSelect}
            className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap flex-shrink-0 ${
              isSelected
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-white text-gray-900 hover:bg-gray-200'
            }`}
          >
            {isSelected ? t('common.selected') : t('common.select')}
          </button>
        </div>
      </div>
    </div>
  );
}
