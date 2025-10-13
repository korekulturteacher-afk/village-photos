'use client';

import Image from 'next/image';
import { Photo } from '@/lib/google-drive';

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onPhotoClick: (photo: Photo) => void;
  onPhotoSelect: (photoId: string) => void;
}

export default function PhotoGrid({
  photos,
  selectedPhotos,
  onPhotoClick,
  onPhotoSelect,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사진이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => {
        const isSelected = selectedPhotos.has(photo.id);

        return (
          <div
            key={photo.id}
            className="relative group cursor-pointer aspect-square bg-gray-200 rounded-lg overflow-hidden"
          >
            {/* Photo */}
            <div
              onClick={() => onPhotoClick(photo)}
              className="w-full h-full"
            >
              {photo.thumbnailLink ? (
                <img
                  src={photo.thumbnailLink}
                  alt={photo.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Selection Overlay */}
            <div
              className={`absolute inset-0 transition-opacity ${
                isSelected
                  ? 'bg-indigo-600 bg-opacity-30'
                  : 'bg-black bg-opacity-0 group-hover:bg-opacity-10'
              }`}
            />

            {/* Checkbox */}
            <div
              className="absolute top-2 right-2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                onPhotoSelect(photo.id);
              }}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white bg-opacity-80 border-white hover:bg-opacity-100'
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Photo Name (on hover) */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-sm font-medium truncate">
                {photo.name}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
