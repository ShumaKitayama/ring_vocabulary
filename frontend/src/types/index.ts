// 単語とその意味のペアを表す型
export interface WordPair {
  word: string;
  meaning: string;
  id?: string; // データベース上のID
  mastered?: boolean; // 習得済みかどうか
  reviewDate?: string | null; // 次回の復習日
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
