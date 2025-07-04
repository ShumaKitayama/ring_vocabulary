// 単語とその意味のペアを表す型
export interface WordPair {
  word: string;
  meaning: string;
  id?: string; // データベース上のID
  mastered?: boolean; // 習得済みかどうか
  reviewDate?: string | null; // 次回の復習日
  user_word_id?: string; // user_wordsテーブルのID（学習で使用）
}

// OCR APIからのレスポンスの型
export interface OcrResponse {
  wordPairs: WordPair[];
  rawText: string;
  imageUrl?: string;
}

// エラーレスポンスの型
export interface ErrorResponse {
  error: string;
  details?: string;
}

// ユーザー関連の型
export interface UserData {
  id: string;
  email: string;
}

// 単語帳の型
export interface Wordbook {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  wordCount?: number; // 単語数
}

// 単語帳と単語の関連の型
export interface WordbookWord {
  id: string;
  wordbook_id: string;
  word_id: string;
  created_at: string;
}

// 拡張されたWordPair型（単語帳情報を含む）
export interface ExtendedWordPair extends WordPair {
  wordbook_id?: string;
  user_word_id?: string; // user_wordsテーブルのID
}
