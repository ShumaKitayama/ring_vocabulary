// 単語とその意味のペアを表す型
export interface WordPair {
  word: string;
  meaning: string;
  pronunciation?: string; // IPA表記による発音記号
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
  lastStudiedAt?: string; // 最終学習日時
}

// OCR関数から返されるテキストセグメント（データベース関連フィールドなし）
export interface OcrTextSegment {
  text_content: string;
  position: number;
  is_punctuation: boolean;
}

// 穴埋め問題関連の型定義

// 穴埋め問題セット
export interface FillInSet {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  problemCount?: number; // 問題数
}

// 分割されたテキスト
export interface FillInText {
  id: string;
  set_id: string;
  text_content: string;
  position: number;
  is_punctuation: boolean;
  created_at: string;
}

// 穴埋め問題
export interface FillInProblem {
  id: string;
  set_id: string;
  text_id: string;
  correct_answer: string;
  hint?: string;
  created_at: string;
}

// ユーザーの穴埋め問題進捗
export interface UserFillInProgress {
  id: string;
  user_id: string;
  problem_id: string;
  correct_count: number;
  incorrect_count: number;
  last_answer?: string;
  is_correct?: boolean;
  mastered: boolean;
  review_date?: string | null;
  created_at: string;
  updated_at: string;
}

// 拡張された穴埋め問題型（テキスト情報を含む）
export interface ExtendedFillInProblem extends FillInProblem {
  text?: FillInText;
  progress?: UserFillInProgress;
}

// 穴埋め問題セットの詳細（テキストと問題を含む）
export interface FillInSetDetail extends FillInSet {
  texts: FillInText[];
  problems: ExtendedFillInProblem[];
}

// 文章読み取りOCR APIからのレスポンスの型
export interface TextOcrResponse {
  texts: OcrTextSegment[];
  rawText: string;
  imageUrl?: string;
}

// 穴埋め問題学習セッションの型
export interface FillInStudySession {
  set_id: string;
  problems: ExtendedFillInProblem[];
  currentIndex: number;
  userAnswers: { [problemId: string]: string };
  results: { [problemId: string]: boolean };
}
