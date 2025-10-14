'use client';

import { useState, useEffect, useCallback } from 'react';

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
      alert('비밀번호를 입력해주세요.');
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
        alert(data.error || '비밀번호가 올바르지 않습니다');
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('로그인 중 오류가 발생했습니다');
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
        if (data.source === 'google-drive') {
          console.warn('[Admin] photos table missing. Showing Google Drive data only.');
        }
      } else {
        alert(data.error || '사진 목록을 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      alert('사진 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleApproveAll = async (makePublic: boolean = true) => {
    const message = makePublic
      ? '모든 사진을 승인하고 공개로 전환합니다. 계속하시겠습니까?'
      : '모든 사진을 승인하지만 비공개로 유지합니다. 계속하시겠습니까?';

    if (!confirm(message)) {
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
        const statusText = makePublic ? '공개로' : '비공개로';
        alert(data.message || `모든 사진이 승인되고 ${statusText} 설정되었습니다.`);
        await fetchPhotos();
      } else {
        alert(data.error || '모든 사진 승인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error approving all photos:', error);
      alert('모든 사진 승인 처리 중 오류가 발생했습니다.');
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
      alert('사진을 선택해주세요.');
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
        alert(error.error || '작업에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert('작업에 실패했습니다.');
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
        alert(`✅ ${result.message}\n\n동기화됨: ${result.synced}개\n전체: ${result.total}개`);
        await fetchPhotos();
      } else {
        const error = await response.json();

        // Photos 테이블 없을 경우 더 친절한 메시지
        if (error.sqlRequired) {
          const message = `❌ ${error.error}\n\n${error.details}\n\n💡 해결 방법:\n1. Supabase SQL Editor를 열어주세요\n2. QUICK-SETUP.md 파일의 SQL을 복사하세요\n3. SQL Editor에 붙여넣고 Run 버튼을 클릭하세요\n4. 다시 동기화를 시도하세요`;

          if (confirm(`${message}\n\n지금 Supabase SQL Editor를 여시겠습니까?`)) {
            window.open('https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new', '_blank');
          }
        } else {
          alert(`❌ ${error.error || '사진 동기화에 실패했습니다.'}`);
        }
      }
    } catch (error) {
      console.error('Error syncing photos:', error);
      alert('❌ 사진 동기화 중 오류가 발생했습니다.');
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
        alert(data.error || '처리에 실패했습니다');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('서버 오류가 발생했습니다');
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다' });
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
        setMessage({ type: 'success', text: '비밀번호가 변경되었습니다. 다시 로그인해주세요.' });

        setTimeout(() => {
          setIsAuthenticated(false);
          setPassword('');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setIsDefaultPassword(false);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || '비밀번호 변경에 실패했습니다' });
      }
    } catch (error) {
      console.error('Change password error:', error);
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다' });
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
      alert('초대 코드를 입력해주세요');
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
        alert(data.error || '초대 코드 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('Error creating invite code:', error);
      alert('서버 오류가 발생했습니다');
    }
  };

  // Delete invite code
  const handleDeleteInviteCode = async (code: string) => {
    if (!confirm(`초대 코드 "${code}"를 삭제하시겠습니까?`)) {
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
        alert(data.error || '초대 코드 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Error deleting invite code:', error);
      alert('서버 오류가 발생했습니다');
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
        alert(data.error || '초대 코드 업데이트에 실패했습니다');
      }
    } catch (error) {
      console.error('Error toggling invite code:', error);
      alert('서버 오류가 발생했습니다');
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
          <h1 className="text-2xl font-bold text-center mb-6">관리자 로그인</h1>
          <p className="text-sm text-gray-600 text-center mb-6">
            Village Photos 관리자 페이지
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                기본 비밀번호: <code className="bg-gray-100 px-1 py-0.5 rounded">password!</code>
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/gallery'}
              className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm transition"
            >
              ← 갤러리로 돌아가기
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
              <h1 className="text-2xl font-bold text-gray-900">🔧 관리자 대시보드</h1>
              <p className="text-sm text-gray-600 mt-1">Village Photos 관리</p>
            </div>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setPassword('');
                setAllPhotos([]);
                setRequests([]);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              로그아웃
            </button>
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
                <h3 className="text-lg font-semibold text-amber-900 mb-1">⚠️ 기본 비밀번호 사용 중</h3>
                <p className="text-amber-800 text-sm">
                  보안을 위해 기본 비밀번호(password!)를 즉시 변경해주세요.
                  비밀번호 변경 탭에서 새로운 비밀번호를 설정할 수 있습니다.
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
                📸 사진 관리
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'requests'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📥 다운로드 요청
              </button>
              <button
                onClick={() => setActiveTab('invites')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'invites'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎫 초대 코드
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                  activeTab === 'password'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔐 비밀번호 변경
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
                  승인 대기 ({allPhotos.filter(p => !p.is_approved).length})
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
                  승인됨 ({allPhotos.filter(p => p.is_approved).length})
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
                      <span>동기화 중...</span>
                    </>
                  ) : (
                    <span>Google Drive 동기화</span>
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
                      <span>일괄 승인 중...</span>
                    </>
                  ) : (
                    <span>일괄 승인 (공개)</span>
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
                      <span>일괄 승인 중...</span>
                    </>
                  ) : (
                    <span>일괄 승인 (비공개)</span>
                  )}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            {selectedPhotos.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {selectedPhotos.length}개의 사진이 선택되었습니다.
                  </span>
                  <div className="flex space-x-2">
                    {photoFilter === 'pending' && (
                      <>
                        <button
                          onClick={() => handlePhotoAction('approve', true)}
                          className="bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-800"
                        >
                          공개 승인
                        </button>
                        <button
                          onClick={() => handlePhotoAction('approve', false)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                        >
                          숨김 승인
                        </button>
                        <button
                          onClick={() => handlePhotoAction('reject')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          거부
                        </button>
                      </>
                    )}
                    {photoFilter === 'approved' && (
                      <>
                        <button
                          onClick={() => handlePhotoAction('reject')}
                          className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                        >
                          승인 해제
                        </button>
                        <button
                          onClick={() => handlePhotoAction('toggle_public', false)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                        >
                          비공개로 전환
                        </button>
                        <button
                          onClick={() => handlePhotoAction('toggle_public', true)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          공개로 전환
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedPhotos([])}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                    >
                      선택 해제
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
                      src={photo.thumbnail_link || `/api/thumbnail/${photo.id}`}
                      alt={photo.name}
                      className="object-contain w-full h-full"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('googleusercontent.com')) {
                          target.src = `/api/thumbnail/${photo.id}`;
                        }
                      }}
                    />
                    {selectedPhotos.includes(photo.id) && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                        ✓
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
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">공개</span>
                      )}
                      {photo.is_approved && !photo.is_public && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">비공개</span>
                      )}
                      {!photo.is_approved && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded">대기중</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {photoFilter === 'pending' ? '승인 대기 중인 사진이 없습니다.' : '승인된 사진이 없습니다.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Download Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">다운로드 요청 목록</h2>
              <div className="flex gap-2">
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setRequestFilter(status as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      requestFilter === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? '전체' : status === 'pending' ? '대기중' : status === 'approved' ? '승인됨' : '거부됨'}
                  </button>
                ))}
              </div>
            </div>

            {loadingRequests ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">로딩 중...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">요청이 없습니다</p>
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
                            {request.status === 'pending' ? '대기중' : request.status === 'approved' ? '승인됨' : '거부됨'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">이메일: {request.user_email}</p>
                        {request.user_phone && (
                          <p className="text-sm text-gray-600">전화번호: {request.user_phone}</p>
                        )}
                        <p className="text-sm text-gray-600">요청 시간: {new Date(request.requested_at).toLocaleString('ko-KR')}</p>
                        <p className="text-sm text-gray-600">사진 수: {request.photo_ids.length}장</p>
                        {request.reason && (
                          <p className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">사유:</span> {request.reason}
                          </p>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              const note = prompt('관리자 메모 (선택사항):');
                              handleRequestAction(request.id, 'approve', note || undefined);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt('거부 사유 (선택사항):');
                              handleRequestAction(request.id, 'reject', note || undefined);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            거부
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
              <h2 className="text-xl font-bold text-gray-900 mb-4">새 초대 코드 생성</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    초대 코드 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCodeInput}
                    onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder-gray-400 font-mono"
                    placeholder="예: FAMILY2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명 (선택)
                  </label>
                  <input
                    type="text"
                    value={newCodeDescription}
                    onChange={(e) => setNewCodeDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder-gray-400"
                    placeholder="예: 가족 행사용 초대 코드"
                  />
                </div>
                <button
                  onClick={handleCreateInviteCode}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  초대 코드 생성
                </button>
              </div>
            </div>

            {/* Invite codes list */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                초대 코드 목록 ({inviteCodes.length}개)
              </h2>

              {loadingInvites ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">로딩 중...</p>
                </div>
              ) : inviteCodes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">초대 코드가 없습니다</p>
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
                            {invite.is_active ? '활성' : '비활성'}
                          </span>
                        </div>
                        {invite.description && (
                          <p className="text-sm text-gray-600 mb-1">{invite.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          생성일: {new Date(invite.created_at).toLocaleDateString('ko-KR')} |
                          사용 횟수: {invite.used_count}회
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/auth/login?code=${invite.code}`;
                            navigator.clipboard.writeText(url);
                            alert('초대 링크가 클립보드에 복사되었습니다');
                          }}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                          title="초대 링크 복사"
                        >
                          📋 링크 복사
                        </button>
                        <button
                          onClick={() => handleToggleInviteCode(invite.code, invite.is_active)}
                          className={`px-3 py-2 text-sm rounded-lg transition ${
                            invite.is_active
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {invite.is_active ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => handleDeleteInviteCode(invite.code)}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                        >
                          🗑️ 삭제
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">비밀번호 변경</h2>
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="최소 6자 이상"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호 확인</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {newPassword && confirmPassword && (
                <div className={`text-sm ${newPassword === confirmPassword ? 'text-green-700' : 'text-red-700'}`}>
                  {newPassword === confirmPassword ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
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
                비밀번호 변경
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
