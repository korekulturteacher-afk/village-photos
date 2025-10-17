'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/lib/i18n';
import LanguageSelector from '@/components/LanguageSelector';

interface Photo {
  id: string;
  name: string;
  drive_file_id: string;
  is_approved: boolean;
  is_public: boolean;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface DownloadRequest {
  id: string;
  user_email: string;
  user_name: string | null;
  user_phone: string | null;
  photo_ids: string[];
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface InviteCode {
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  used_count: number;
}

export default function AdminPage() {
  const { t } = useTranslations();

  // Authentication
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Tab management
  const [activeTab, setActiveTab] = useState<'photos' | 'requests' | 'invites' | 'password'>('photos');

  // Invite codes management
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');
  const [newCodeDescription, setNewCodeDescription] = useState('');

  // Photos management
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoFilter, setPhotoFilter] = useState<'pending' | 'approved'>('pending');
  const [isGoogleDriveMode, setIsGoogleDriveMode] = useState(false);

  // Download requests management
  const [requests, setRequests] = useState<DownloadRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtered photos
  const photos = photoFilter === 'pending'
    ? allPhotos.filter(p => !p.is_approved)
    : allPhotos.filter(p => p.is_approved);

  // Login handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!password.trim()) {
      alert(t('admin.login.passwordPlaceholder'));
      return;
    }

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        setIsDefaultPassword(data.isDefaultPassword);

        // Load initial data
        await fetchPhotos();
        await fetchRequests();
      } else {
        alert(data.error || t('admin.password.errorMessage'));
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(t('common.error'));
    }
  };

  // Fetch photos
  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const response = await fetch('/api/admin/photos?status=all', {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      const data = await response.json();

      if (response.ok) {
        setAllPhotos(Array.isArray(data.photos) ? data.photos : []);
        setIsGoogleDriveMode(data.source === 'google-drive');
      } else {
        alert(data.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      alert(t('common.error'));
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleApproveAll = async (makePublic: boolean = true) => {
    const message = makePublic
      ? t('admin.photos.approveAll')
      : t('admin.photos.approveAllPrivate');

    if (!confirm(`${message} - ${t('common.confirm')}?`)) {
      return;
    }

    setApprovingAll(true);
    try {
      const response = await fetch('/api/admin/approve-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: makePublic }),
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message || t('common.success'));
        await fetchPhotos();
      } else {
        alert(data.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error approving all photos:', error);
      alert(t('common.error'));
    } finally {
      setApprovingAll(false);
    }
  };

  // Fetch download requests
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch(`/api/admin/download-requests?status=${requestFilter}`);
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Photo actions
  const handlePhotoAction = async (action: 'approve' | 'reject' | 'toggle_public', isPublic?: boolean) => {
    if (selectedPhotos.length === 0) {
      alert(t('common.select'));
      return;
    }

    try {
      const response = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ action, photoIds: selectedPhotos, isPublic }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setSelectedPhotos([]);
        await fetchPhotos();
      } else {
        const error = await response.json();
        alert(error.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert(t('common.error'));
    }
  };

  // Sync photos from Google Drive
  const handleSyncPhotos = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      const response = await fetch('/api/admin/sync-photos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${password}` },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${t('common.success')}\n\n${result.message}`);
        await fetchPhotos();
      } else {
        const error = await response.json();
        alert(error.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error syncing photos:', error);
      alert(t('common.error'));
    } finally {
      setSyncing(false);
    }
  };

  // Request actions
  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject', adminNote?: string) => {
    try {
      const response = await fetch('/api/admin/download-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, adminNote }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchRequests();
        alert(data.message);
      } else {
        alert(data.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert(t('common.error'));
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('admin.password.noMatch') });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: t('admin.password.minLength') });
      return;
    }

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: t('admin.password.successMessage') });

        setTimeout(() => {
          setIsAuthenticated(false);
          setPassword('');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setIsDefaultPassword(false);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || t('admin.password.errorMessage') });
      }
    } catch (error) {
      console.error('Change password error:', error);
      setMessage({ type: 'error', text: t('common.error') });
    }
  };

  // Fetch invite codes
  const fetchInviteCodes = async () => {
    setLoadingInvites(true);
    try {
      const response = await fetch('/api/admin/invite-codes', {
        headers: { 'x-admin-password': password },
      });
      const data = await response.json();

      if (data.success) {
        setInviteCodes(data.codes);
      }
    } catch (error) {
      console.error('Error fetching invite codes:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  // Create new invite code
  const handleCreateInviteCode = async () => {
    if (!newCodeInput.trim()) {
      alert(t('admin.invites.codeLabel'));
      return;
    }

    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          code: newCodeInput.trim(),
          description: newCodeDescription.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setNewCodeInput('');
        setNewCodeDescription('');
        await fetchInviteCodes();
      } else {
        alert(data.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error creating invite code:', error);
      alert(t('common.error'));
    }
  };

  // Delete invite code
  const handleDeleteInviteCode = async (code: string) => {
    if (!confirm(t('admin.invites.deleteConfirm', { code }))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/invite-codes/${code}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        await fetchInviteCodes();
      } else {
        alert(data.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error deleting invite code:', error);
      alert(t('common.error'));
    }
  };

  // Toggle invite code active status
  const handleToggleInviteCode = async (code: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/invite-codes/${code}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchInviteCodes();
      } else {
        alert(data.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error toggling invite code:', error);
      alert(t('common.error'));
    }
  };

  // Load requests when filter changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 'requests') {
      fetchRequests();
    }
  }, [requestFilter, activeTab, isAuthenticated]);

  // Load invite codes when tab changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 'invites') {
      fetchInviteCodes();
    }
  }, [activeTab, isAuthenticated]);

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex justify-end mb-4">
            <LanguageSelector />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">{t('admin.login.title')}</h1>
          <p className="text-sm text-gray-600 text-center mb-6">
            {t('admin.login.subtitle')}
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.login.passwordLabel')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder={t('admin.login.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('admin.login.defaultPasswordHint')}
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              {t('admin.login.loginButton')}
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/gallery'}
              className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm transition"
            >
              {t('admin.login.backToGallery')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main admin page
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
              <p className="text-sm text-gray-600 mt-1">Village Photos</p>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setPassword('');
                  setAllPhotos([]);
                  setRequests([]);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('admin.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Default password warning */}
      {isDefaultPassword && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-1">{t('admin.defaultPassword.title')}</h3>
                <p className="text-amber-800 text-sm">
                  {t('admin.defaultPassword.message')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('photos')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'photos'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.tabs.photos')}
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'requests'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.tabs.requests')}
              </button>
              <button
                onClick={() => setActiveTab('invites')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'invites'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.tabs.invites')}
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'password'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.tabs.password')}
              </button>
            </nav>
          </div>
        </div>

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* Photos controls */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setPhotoFilter('pending');
                    setSelectedPhotos([]);
                  }}
                  className={`px-4 py-2 rounded-md ${
                    photoFilter === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('admin.photos.pending')} ({allPhotos.filter(p => !p.is_approved).length})
                </button>
                <button
                  onClick={() => {
                    setPhotoFilter('approved');
                    setSelectedPhotos([]);
                  }}
                  className={`px-4 py-2 rounded-md ${
                    photoFilter === 'approved'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('admin.photos.approved')} ({allPhotos.filter(p => p.is_approved).length})
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSyncPhotos}
                  disabled={syncing}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {syncing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{t('admin.photos.syncing')}</span>
                    </>
                  ) : (
                    <span>{t('admin.photos.sync')}</span>
                  )}
                </button>
                <button
                  onClick={() => handleApproveAll(true)}
                  disabled={approvingAll}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {approvingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{t('admin.photos.syncing')}</span>
                    </>
                  ) : (
                    <span>{t('admin.photos.approveAll')}</span>
                  )}
                </button>
                <button
                  onClick={() => handleApproveAll(false)}
                  disabled={approvingAll}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {approvingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{t('admin.photos.syncing')}</span>
                    </>
                  ) : (
                    <span>{t('admin.photos.approveAllPrivate')}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            {selectedPhotos.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {t('admin.photos.selectedCount', { count: selectedPhotos.length })}
                  </span>
                  <div className="flex space-x-2">
                    {photoFilter === 'pending' && (
                      <>
                        <button
                          onClick={() => handlePhotoAction('approve', true)}
                          className="bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-800"
                        >
                          {t('admin.photos.approvePublic')}
                        </button>
                        <button
                          onClick={() => handlePhotoAction('approve', false)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                        >
                          {t('admin.photos.approvePrivate')}
                        </button>
                        <button
                          onClick={() => handlePhotoAction('reject')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          {t('admin.photos.reject')}
                        </button>
                      </>
                    )}
                    {photoFilter === 'approved' && (
                      <>
                        <button
                          onClick={() => handlePhotoAction('reject')}
                          className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                        >
                          {t('admin.photos.unapprove')}
                        </button>
                        <button
                          onClick={() => handlePhotoAction('toggle_public', false)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                        >
                          {t('admin.photos.toggleToPrivate')}
                        </button>
                        <button
                          onClick={() => handlePhotoAction('toggle_public', true)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          {t('admin.photos.toggleToPublic')}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedPhotos([])}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                    >
                      {t('admin.photos.clearSelection')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Photos grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all ${
                    selectedPhotos.includes(photo.id)
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => {
                    setSelectedPhotos(prev =>
                      prev.includes(photo.id)
                        ? prev.filter(id => id !== photo.id)
                        : [...prev, photo.id]
                    );
                  }}
                >
                  <div className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`}
                      alt={photo.name}
                      className="object-contain w-full h-full"
                      loading="lazy"
                      decoding="async"
                    />
                    {selectedPhotos.includes(photo.id) && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 truncate" title={photo.name}>
                      {photo.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(photo.created_at).toLocaleDateString()}</span>
                      {photo.is_approved && photo.is_public && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{t('admin.photos.status.public')}</span>
                      )}
                      {photo.is_approved && !photo.is_public && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{t('admin.photos.status.private')}</span>
                      )}
                      {!photo.is_approved && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded">{t('admin.photos.status.pending')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {photoFilter === 'pending' ? t('admin.photos.noPending') : t('admin.photos.noApproved')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Download Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('admin.requests.title')}</h2>
              <div className="flex gap-2">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setRequestFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      requestFilter === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t(`admin.requests.filter${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {loadingRequests ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">{t('common.loading')}</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">{t('admin.requests.noRequests')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{request.user_name || request.user_email}</h3>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {t(`requests.status.${request.status}`)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{t('admin.requests.email')}: {request.user_email}</p>
                        {request.user_phone && (
                          <p className="text-sm text-gray-600">{t('admin.requests.phone')}: {request.user_phone}</p>
                        )}
                        <p className="text-sm text-gray-600">{t('admin.requests.requestedAt')}: {new Date(request.requested_at).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{t('admin.requests.photoCount')}: {request.photo_ids.length}</p>
                        {request.reason && (
                          <p className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">{t('admin.requests.reason')}:</span> {request.reason}
                          </p>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              const note = prompt(t('admin.requests.adminNotePrompt'));
                              handleRequestAction(request.id, 'approve', note || undefined);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            {t('admin.requests.approve')}
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt(t('admin.requests.rejectReasonPrompt'));
                              handleRequestAction(request.id, 'reject', note || undefined);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            {t('admin.requests.reject')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invite Codes Tab */}
        {activeTab === 'invites' && (
          <div className="space-y-6">
            {/* Create new invite code */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('admin.invites.createTitle')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.invites.codeLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCodeInput}
                    onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder-gray-400 font-mono"
                    placeholder={t('admin.invites.codePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.invites.descriptionLabel')}
                  </label>
                  <input
                    type="text"
                    value={newCodeDescription}
                    onChange={(e) => setNewCodeDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder-gray-400"
                    placeholder={t('admin.invites.descriptionPlaceholder')}
                  />
                </div>
                <button
                  onClick={handleCreateInviteCode}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  {t('admin.invites.createButton')}
                </button>
              </div>
            </div>

            {/* Invite codes list */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('admin.invites.listTitle')} ({inviteCodes.length})
              </h2>

              {loadingInvites ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">{t('common.loading')}</p>
                </div>
              ) : inviteCodes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">{t('admin.invites.listTitle')} (0)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inviteCodes.map((invite) => (
                    <div
                      key={invite.code}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-indigo-300 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 font-mono">
                            {invite.code}
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              invite.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {invite.is_active ? t('admin.invites.active') : t('admin.invites.inactive')}
                          </span>
                        </div>
                        {invite.description && (
                          <p className="text-sm text-gray-600 mb-1">{invite.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(invite.created_at).toLocaleDateString()} |
                          {' '}{t('admin.invites.usedCount', { count: invite.used_count })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/auth/login?code=${invite.code}`;
                            navigator.clipboard.writeText(url);
                            alert(t('admin.invites.copyLink'));
                          }}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                          title={t('admin.invites.copyLink')}
                        >
                          {t('admin.invites.copyLink')}
                        </button>
                        <button
                          onClick={() => handleToggleInviteCode(invite.code, invite.is_active)}
                          className={`px-3 py-2 text-sm rounded-lg transition ${
                            invite.is_active
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {invite.is_active ? t('admin.invites.deactivate') : t('admin.invites.activate')}
                        </button>
                        <button
                          onClick={() => handleDeleteInviteCode(invite.code)}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Password Change Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.password.title')}</h2>
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.password.currentLabel')}</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showCurrentPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.password.newLabel')}</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
                    placeholder={t('admin.password.minLength')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showNewPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.password.confirmLabel')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showConfirmPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {newPassword && confirmPassword && (
                <div className={`text-sm ${newPassword === confirmPassword ? 'text-green-700' : 'text-red-700'}`}>
                  {newPassword === confirmPassword ? t('admin.password.match') : t('admin.password.noMatch')}
                </div>
              )}

              {message && (
                <div className={`px-4 py-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {t('admin.password.changeButton')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
