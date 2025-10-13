'use client';

import { Photo } from '@/lib/google-drive';
import { useEffect } from 'react';

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
  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

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
        <div className="relative">
          {photo.webViewLink ? (
            <img
              src={`https://drive.google.com/uc?export=view&id=${photo.id}`}
              alt={photo.name}
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />
          ) : (
            <div className="w-full h-96 bg-gray-800 flex items-center justify-center">
              <p className="text-white">이미지를 불러올 수 없습니다</p>
            </div>
          )}
        </div>

        {/* Info Bar */}
        <div className="mt-4 flex items-center justify-between bg-gray-900 bg-opacity-50 rounded-lg p-4">
          <div className="text-white">
            <p className="font-medium">{photo.name}</p>
            <p className="text-sm text-gray-300 mt-1">
              {currentIndex + 1} / {photos.length}
            </p>
          </div>

          <button
            onClick={onToggleSelect}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              isSelected
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-white text-gray-900 hover:bg-gray-200'
            }`}
          >
            {isSelected ? '선택됨 ✓' : '선택하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
