import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { SupabaseAdapter } from "@auth/supabase-adapter";

// Supabase adapter and Resend email provider are only active when the env vars are set.
// Without Supabase, the app still works with Google OAuth + JWT sessions.
const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(hasSupabase && {
    adapter: SupabaseAdapter({
      url: process.env.SUPABASE_URL!,
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),
  }),
  providers: [
    Google,
    ...(hasSupabase
      ? [Resend({ from: process.env.AUTH_EMAIL_FROM ?? "noreply@instainsights.app" })]
      : []),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
