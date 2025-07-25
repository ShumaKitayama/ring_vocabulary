-- 最終学習日時フィールドの追加

-- user_wordsテーブルに最終学習日時フィールドを追加
ALTER TABLE user_words ADD COLUMN IF NOT EXISTS last_studied_at TIMESTAMP WITH TIME ZONE;

-- 最終学習日時フィールドにコメントを追加
COMMENT ON COLUMN user_words.last_studied_at IS '最後に学習した日時';

-- インデックスを追加（最終学習日時での並び替えを高速化）
CREATE INDEX IF NOT EXISTS idx_user_words_last_studied_at ON user_words(last_studied_at);

-- 既存のreview_dateインデックスも確認
CREATE INDEX IF NOT EXISTS idx_user_words_review_date ON user_words(review_date); 