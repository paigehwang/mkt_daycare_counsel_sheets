import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { hd: "caring.co.kr" },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = (profile as any)?.email ?? ""
      const hd = (profile as any)?.hd ?? ""
      return email.endsWith("@caring.co.kr") || hd === "caring.co.kr"
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
}
