// 43V3R BET AI - NextAuth Configuration
// JWT-based authentication with credentials and OAuth providers

import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      username: string;
      role: string;
      wallet?: {
        balance: number;
        virtualBalance: number;
      };
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    username: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    username: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    // Credentials Provider (Email/Password)
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { wallet: true },
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        // For demo purposes, accept any password
        // In production, verify with: await bcrypt.compare(credentials.password, user.passwordHash)
        if (credentials.password === 'demo123' || credentials.password.length >= 6) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.email.split('@')[0],
            role: user.role,
          };
        }

        throw new Error('Invalid password');
      },
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          username: profile.email.split('@')[0],
          role: 'user',
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/auth/signup',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.name = user.name;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.username = token.username;
        session.user.role = token.role;

        // Fetch wallet data
        const wallet = await db.wallet.findUnique({
          where: { userId: token.id },
        });

        if (wallet) {
          session.user.wallet = {
            balance: wallet.balance,
            virtualBalance: wallet.virtualBalance,
          };
        }
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // Create wallet for new users
      if (account?.provider === 'google' && user.email) {
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          const newUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name,
              username: user.email.split('@')[0],
              passwordHash: '',
              role: 'user',
            },
          });

          await db.wallet.create({
            data: {
              userId: newUser.id,
              balance: 0,
              virtualBalance: 5000,
              totalProfit: 0,
              totalBets: 0,
              winRate: 0,
              roi: 0,
            },
          });
        }
      }
      return true;
    },
  },

  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
