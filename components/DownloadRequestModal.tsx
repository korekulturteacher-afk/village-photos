'use client';

import { useState } from 'react';

interface DownloadRequestModalProps {
  selectedCount: number;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}

export default function DownloadRequestModal({
  selectedCount,
  onSubmit,
  onClose,
}: DownloadRequestModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(reason);
      onClose();
    } catch (error) {
      alert('신청 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            다운로드 신청
          </h2>

          <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-800">
              <span className="font-semibold">선택한 사진:</span> {selectedCount}장
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              관리자 승인 후 다운로드 가능합니다
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                신청 사유 (선택)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="예: 가족 행사 사진이 필요합니다"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? '신청 중...' : '신청하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
