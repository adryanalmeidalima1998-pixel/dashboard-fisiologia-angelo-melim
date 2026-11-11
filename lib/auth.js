import CredentialsProvider from 'next-auth/providers/credentials'
import { getServerSession } from 'next-auth'
import { verifyConfiguredPassword, credentialVersion } from './password.mjs'
export const authOptions = {
  providers: [CredentialsProvider({
    name: 'Acesso pessoal',
    credentials: { username: { label: 'Usuário', type: 'text' }, password: { label: 'Senha', type: 'password' } },
    async authorize(credentials) {
      if (!process.env.NEXTAUTH_SECRET) return null
      const username = process.env.DASHBOARD_USERNAME || 'angelo.melim'
      if (credentials?.username?.trim() !== username || typeof credentials?.password !== 'string' || credentials.password.length > 1024) return null
      if (!verifyConfiguredPassword(credentials.password)) return null
      return { id: 'angelo-melim', name: 'Ângelo Melim', credentialVersion: credentialVersion() }
    },
  })],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 4 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) { if (user) token.credentialVersion = user.credentialVersion; return token },
    async session({ session, token }) {
      if (token.sub !== 'angelo-melim' || token.credentialVersion !== credentialVersion()) return { ...session, user: null }
      session.user = { id: 'angelo-melim', name: 'Ângelo Melim' }
      return session
    },
  },
}
export async function getOwnerSession() {
  const session = await getServerSession(authOptions)
  return session?.user?.id === 'angelo-melim' ? session : null
}
