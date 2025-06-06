import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

// 認証コンテキストの型定義
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{
    error: Error | null;
    data: unknown | null;
  }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: Error | null;
    data: unknown | null;
  }>;
  signOut: () => Promise<void>;
}

// 認証コンテキストの作成
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
