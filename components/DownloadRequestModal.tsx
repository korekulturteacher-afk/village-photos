'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n';

interface DownloadRequestModalProps {
  selectedCount: number;
  onSubmit: (data: { name: string; phone: string; reason: string }) => Promise<void>;
  onClose: () => void;
}

export default function DownloadRequestModal({
  selectedCount,
  onSubmit,
  onClose,
}: DownloadRequestModalProps) {
  const { t } = useTranslations();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert(t('modal.downloadRequest.nameRequired'));
      return;
    }

    if (!phone.trim()) {
      alert(t('modal.downloadRequest.phoneRequired'));
      return;
    }

    setLoading(true);

    try {
      await onSubmit({ name: name.trim(), phone: phone.trim(), reason: reason.trim() });
      onClose();
    } catch (error) {
      alert(t('modal.downloadRequest.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('modal.downloadRequest.title')}
          </h2>

          <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-800">
              {t('modal.downloadRequest.subtitle', { count: selectedCount })}
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              {t('modal.downloadRequest.approvalNote')}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('modal.downloadRequest.nameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                placeholder={t('modal.downloadRequest.namePlaceholder')}
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('modal.downloadRequest.phoneLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                placeholder={t('modal.downloadRequest.phonePlaceholder')}
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('modal.downloadRequest.reasonLabel')}
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                placeholder={t('modal.downloadRequest.reasonPlaceholder')}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {t('modal.downloadRequest.cancelButton')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? t('modal.downloadRequest.submitting') : t('modal.downloadRequest.submitButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
