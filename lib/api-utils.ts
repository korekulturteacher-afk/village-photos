import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Standard API error responses
export const ApiError = {
  unauthorized: (message = '인증이 필요합니다') =>
    NextResponse.json({ error: message }, { status: 401 }),

  forbidden: (message = '권한이 없습니다') =>
    NextResponse.json({ error: message }, { status: 403 }),

  badRequest: (message = '잘못된 요청입니다') =>
    NextResponse.json({ error: message }, { status: 400 }),

  notFound: (message = '요청한 리소스를 찾을 수 없습니다') =>
    NextResponse.json({ error: message }, { status: 404 }),

  serverError: (message = '서버 오류가 발생했습니다') =>
    NextResponse.json({ error: message }, { status: 500 }),
};

// Standard API success responses
export const ApiSuccess = {
  ok: <T>(data: T) =>
    NextResponse.json({ success: true, ...data }),

  created: <T>(data: T) =>
    NextResponse.json({ success: true, ...data }, { status: 201 }),

  noContent: () =>
    new NextResponse(null, { status: 204 }),
};

// Authentication utilities
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return { session: null, error: ApiError.unauthorized() };
  }

  return { session, error: null };
}

export async function requireAllowedUser() {
  const { session, error } = await requireAuth();

  if (error) return { session: null, error };

  if (!session!.user!.isAllowed) {
    return { session: null, error: ApiError.forbidden('접근 권한이 없습니다') };
  }

  return { session: session!, error: null };
}

// Request validation
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; error: NextResponse | null } {
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return {
        valid: false,
        error: ApiError.badRequest(`${String(field)} 필드가 필요합니다`),
      };
    }
  }

  return { valid: true, error: null };
}

// Error logging
export function logError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}
