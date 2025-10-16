'use client';

import { Photo } from '@/lib/google-drive';
import OptimizedImage from './OptimizedImage';
import { useTranslations } from '@/lib/i18n';
import { getGoogleDriveThumbnailLink, getApiFallbackUrl } from '@/lib/google-drive-urls';

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
  const { t } = useTranslations();

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('gallery.noPhotos')}</p>
      </div>
    );
  }

  // 썸네일 URL - Google Drive 직접 링크 사용 (빠른 로딩, 타임아웃 없음)
  // 파일이 "링크가 있는 모든 사용자"로 공유되어야 함
  const getOptimizedThumbnail = (photo: Photo) => {
    return getGoogleDriveThumbnailLink(photo.id, 400);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo, index) => {
        const isSelected = selectedPhotos.has(photo.id);
        // 첫 24개 이미지에 priority 설정 (처음 2-3 스크롤)
        const isPriority = index < 24;

        return (
          <div
            key={photo.id}
            className={`relative group cursor-pointer rounded-lg overflow-hidden shadow-sm transition-all ${
              isSelected
                ? 'ring-4 ring-indigo-500 shadow-lg'
                : 'hover:shadow-xl hover:ring-2 hover:ring-indigo-400'
            }`}
            style={{ backgroundColor: '#f3f4f6', width: '100%', height: '180px', minHeight: '120px', maxHeight: '220px' }}
          >
            {/* Photo with Optimized Loading */}
            <div
              onClick={() => onPhotoClick(photo)}
              className="w-full h-full relative group-hover:scale-105 transition-transform duration-200"
            >
              <OptimizedImage
                src={getOptimizedThumbnail(photo)}
                alt={photo.name}
                fallbackSrc={getApiFallbackUrl(photo.id, 'thumbnail')}
                priority={isPriority}
                className="w-full h-full object-contain"
                style={{ zIndex: 1 }}
              />
            </div>


            {/* Checkbox */}
            <div
              className="absolute top-2 right-2"
              style={{ zIndex: 10 }}
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
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ zIndex: 3 }}
            >
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
