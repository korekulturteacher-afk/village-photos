import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from './supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) {
        console.error('Sign-in attempt without email address is not allowed.');
        return false;
      }
      return true;
    },
    async session({ session }) {
      if (!session.user?.email) {
        return session;
      }

      try {
        const { data: userRecord, error } = await supabaseAdmin
          .from('allowed_users')
          .select('is_admin')
          .eq('email', session.user.email)
          .maybeSingle();

        if (error) {
          const hint =
            (typeof error === 'object' && error !== null && 'message' in error)
              ? error.message
              : String(error);

          if (typeof hint === 'string' && hint.includes('Invalid API key')) {
            console.error(
              'Supabase returned "Invalid API key". Please verify SUPABASE_SERVICE_ROLE_KEY.',
            );
          } else {
            console.error('Error retrieving allowlist status:', error);
          }
        }

        session.user.isAllowed = Boolean(userRecord);
        session.user.isAdmin = userRecord?.is_admin ?? false;
      } catch (error) {
        console.error('Unexpected session callback error:', error);
        session.user.isAllowed = false;
        session.user.isAdmin = false;
      }

      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
