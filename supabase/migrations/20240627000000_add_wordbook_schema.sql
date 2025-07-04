-- 単語帳管理機能の追加

-- 単語帳テーブル
CREATE TABLE IF NOT EXISTS wordbooks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- 単語帳のタイトル
  description TEXT, -- 説明（任意）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 単語帳と単語の関連テーブル
CREATE TABLE IF NOT EXISTS wordbook_words (
  id BIGSERIAL PRIMARY KEY,
  wordbook_id BIGINT NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
  word_id BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- 同じ単語帳に同じ単語は一度だけ
  CONSTRAINT unique_wordbook_word UNIQUE (wordbook_id, word_id)
);

-- user_wordsテーブルにwordbook_idを追加
ALTER TABLE user_words ADD COLUMN IF NOT EXISTS wordbook_id BIGINT REFERENCES wordbooks(id) ON DELETE SET NULL;

-- updated_atの自動更新トリガーを追加
CREATE TRIGGER update_wordbooks_updated_at
BEFORE UPDATE ON wordbooks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーを設定
ALTER TABLE wordbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordbook_words ENABLE ROW LEVEL SECURITY;

-- wordbooks テーブルの RLS ポリシー（自分のデータのみ操作可能）
CREATE POLICY wordbooks_select_policy ON wordbooks
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY wordbooks_insert_policy ON wordbooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY wordbooks_update_policy ON wordbooks
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY wordbooks_delete_policy ON wordbooks
  FOR DELETE USING (auth.uid() = user_id);

-- wordbook_words テーブルの RLS ポリシー
CREATE POLICY wordbook_words_select_policy ON wordbook_words
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wordbooks 
      WHERE id = wordbook_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY wordbook_words_insert_policy ON wordbook_words
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wordbooks 
      WHERE id = wordbook_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY wordbook_words_update_policy ON wordbook_words
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM wordbooks 
      WHERE id = wordbook_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY wordbook_words_delete_policy ON wordbook_words
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM wordbooks 
      WHERE id = wordbook_id AND user_id = auth.uid()
    )
  );

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_wordbooks_user_id ON wordbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_wordbooks_created_at ON wordbooks(created_at);
CREATE INDEX IF NOT EXISTS idx_wordbook_words_wordbook_id ON wordbook_words(wordbook_id);
CREATE INDEX IF NOT EXISTS idx_user_words_wordbook_id ON user_words(wordbook_id);
CREATE INDEX IF NOT EXISTS idx_user_words_review_date ON user_words(review_date); 