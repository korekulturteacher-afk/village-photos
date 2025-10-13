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
    async signIn({ user, account, profile }) {
      const email = user.email;

      if (!email) {
        return false;
      }

      // Check if user is in allowed_users table
      const { data: allowedUser, error } = await supabaseAdmin
        .from('allowed_users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !allowedUser) {
        // User not in whitelist
        return '/auth/unauthorized';
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        // Add custom fields to session
        const { data: userData } = await supabaseAdmin
          .from('allowed_users')
          .select('is_admin')
          .eq('email', session.user.email)
          .single();

        session.user.isAdmin = userData?.is_admin || false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
