-- 発音記号フィールドの追加

-- wordsテーブルに発音記号フィールドを追加
ALTER TABLE words ADD COLUMN IF NOT EXISTS pronunciation TEXT;

-- 発音記号フィールドにコメントを追加
COMMENT ON COLUMN words.pronunciation IS 'IPA表記による発音記号 (例: /ˈprəˌnʌnsiˈeɪʃən/)';

-- インデックスを追加（発音記号での検索を高速化）
CREATE INDEX IF NOT EXISTS idx_words_pronunciation ON words(pronunciation); 