// Database table types

export interface InviteCode {
  code: string;
  created_by: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  description: string | null;
}

export interface InviteCodeUsage {
  id: string;
  code: string;
  user_email: string;
  user_name: string | null;
  used_at: string;
  ip_address: string | null;
}

export interface AllowedUser {
  id: string;
  email: string;
  name: string | null;
  invited_by: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface AdminConfig {
  id: number;
  password_hash: string;
  updated_at: string;
}

export interface Photo {
  id: string; // Google Drive file ID
  name: string;
  mime_type: string;
  size: number | null;
  thumbnail_link: string | null;
  web_content_link: string | null;
  web_view_link: string | null;
  created_time: string | null;
  modified_time: string | null;
  is_approved: boolean;
  is_public: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DownloadRequest {
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
  download_expires_at: string | null;
}

export interface ApprovedDownload {
  id: string;
  request_id: string;
  user_email: string;
  photo_id: string;
  downloaded: boolean;
  downloaded_at: string | null;
  download_token: string | null;
  token_expires_at: string | null;
  created_at: string;
}

export interface DownloadLog {
  id: string;
  user_email: string;
  file_id: string;
  file_name: string | null;
  ip_address: string | null;
  downloaded_at: string;
}

export interface RateLimit {
  user_email: string;
  download_count: number;
  request_count: number;
  reset_at: string;
}
