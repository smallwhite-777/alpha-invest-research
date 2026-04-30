import type { NextAuthConfig, DefaultSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

export type UserRole = 'USER' | 'ADMIN'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession['user']
  }
  interface User {
    role?: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole
  }
}

type _ExtendedJWT = JWT

export default {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: UserRole }).role ?? 'USER'
        token.sub = (user as { id?: string }).id ?? token.sub
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id
        session.user.role = (token.role as UserRole) ?? 'USER'
      }
      return session
    },
  },
} satisfies NextAuthConfig
