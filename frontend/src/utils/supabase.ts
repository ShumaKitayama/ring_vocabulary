import { createClient } from "@supabase/supabase-js";

// 環境変数からSupabaseの設定を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// データベーステーブル名を定数として定義
export const TABLES = {
  WORDS: "words",
  USER_WORDS: "user_words",
  USER_PROFILES: "user_profiles",
};

// Supabaseのデータ型定義
export interface WordRecord {
  id: number;
  word: string;
  meaning: string;
  created_at: string;
}

export interface UserWordRecord {
  id: number;
  user_id: string;
  word_id: number;
  mastered: boolean;
  review_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}
