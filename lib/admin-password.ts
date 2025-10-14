import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default password hash for "password!"
const DEFAULT_PASSWORD = 'password!';

/**
 * Get the current admin password hash from database
 */
export async function getPasswordHash(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('password_hash')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.log('[Admin] No password found, using default');
      // If no password exists, create default password
      const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await setPasswordHash(defaultHash);
      return defaultHash;
    }

    return data.password_hash;
  } catch (error) {
    console.error('[Admin] Error getting password hash:', error);
    // Return default password hash as fallback
    return await bcrypt.hash(DEFAULT_PASSWORD, 10);
  }
}

/**
 * Set a new admin password hash in database
 */
export async function setPasswordHash(hash: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_config')
      .upsert({ id: 1, password_hash: hash, updated_at: new Date().toISOString() });

    if (error) {
      console.error('[Admin] Error setting password hash:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Admin] Error setting password hash:', error);
    return false;
  }
}

/**
 * Verify a password against the stored hash
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const hash = await getPasswordHash();
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('[Admin] Error verifying password:', error);
    return false;
  }
}

/**
 * Change the admin password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify current password
    const isValid = await verifyPassword(currentPassword);
    if (!isValid) {
      return { success: false, error: '현재 비밀번호가 올바르지 않습니다' };
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const success = await setPasswordHash(newHash);
    if (!success) {
      return { success: false, error: '비밀번호 변경에 실패했습니다' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Admin] Error changing password:', error);
    return { success: false, error: '서버 오류가 발생했습니다' };
  }
}
