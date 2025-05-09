// 単語とその意味のペアを表す型
export interface WordPair {
  word: string;
  meaning: string;
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
