import { createClient } from "@supabase/supabase-js";

// 環境変数からSupabaseの設定を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  },
});

// データベーステーブル名を定数として定義
export const TABLES = {
  WORDS: "words",
  USER_WORDS: "user_words",
  USER_PROFILES: "user_profiles",
  WORDBOOKS: "wordbooks",
  WORDBOOK_WORDS: "wordbook_words",
  FILL_IN_SETS: "fill_in_sets",
  FILL_IN_TEXTS: "fill_in_texts",
  FILL_IN_PROBLEMS: "fill_in_problems",
  USER_FILL_IN_PROGRESS: "user_fill_in_progress",
};

// Supabaseのデータ型定義
export interface WordRecord {
  id: number;
  word: string;
  meaning: string;
  pronunciation?: string; // IPA表記による発音記号
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
