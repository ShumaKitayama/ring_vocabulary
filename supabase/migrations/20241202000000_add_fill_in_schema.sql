-- 穴埋め問題機能の追加

-- 穴埋め問題セットテーブル（単語帳に相当）
CREATE TABLE IF NOT EXISTS fill_in_sets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- 穴埋め問題セットのタイトル
  description TEXT, -- 説明（任意）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 読み取った文章の分割テキストテーブル
CREATE TABLE IF NOT EXISTS fill_in_texts (
  id BIGSERIAL PRIMARY KEY,
  set_id BIGINT NOT NULL REFERENCES fill_in_sets(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL, -- 分割されたテキスト（単語、句読点など）
  position INTEGER NOT NULL, -- 文章内での位置
  is_punctuation BOOLEAN DEFAULT FALSE, -- 句読点かどうか
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 穴埋め問題テーブル（どのテキストを穴埋めにするか）
CREATE TABLE IF NOT EXISTS fill_in_problems (
  id BIGSERIAL PRIMARY KEY,
  set_id BIGINT NOT NULL REFERENCES fill_in_sets(id) ON DELETE CASCADE,
  text_id BIGINT NOT NULL REFERENCES fill_in_texts(id) ON DELETE CASCADE,
  correct_answer TEXT NOT NULL, -- 正解
  hint TEXT, -- ヒント（任意）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- 同じセット内で同じテキストは一度だけ穴埋めにできる
  CONSTRAINT unique_set_text_problem UNIQUE (set_id, text_id)
);

-- ユーザーの穴埋め問題学習進捗テーブル
CREATE TABLE IF NOT EXISTS user_fill_in_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id BIGINT NOT NULL REFERENCES fill_in_problems(id) ON DELETE CASCADE,
  correct_count INTEGER DEFAULT 0, -- 正解回数
  incorrect_count INTEGER DEFAULT 0, -- 不正解回数
  last_answer TEXT, -- 最後の回答
  is_correct BOOLEAN, -- 最後の回答が正解かどうか
  mastered BOOLEAN DEFAULT FALSE, -- 習得済みかどうか
  review_date TIMESTAMP WITH TIME ZONE, -- 次回の復習日
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- 同じユーザーが同じ問題を複数回記録しないように
  CONSTRAINT unique_user_problem UNIQUE (user_id, problem_id)
);

-- updated_atの自動更新トリガーを追加
CREATE TRIGGER update_fill_in_sets_updated_at
BEFORE UPDATE ON fill_in_sets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_fill_in_progress_updated_at
BEFORE UPDATE ON user_fill_in_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーを設定
ALTER TABLE fill_in_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fill_in_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fill_in_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fill_in_progress ENABLE ROW LEVEL SECURITY;

-- fill_in_sets テーブルの RLS ポリシー（自分のデータのみ操作可能）
CREATE POLICY fill_in_sets_select_policy ON fill_in_sets
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY fill_in_sets_insert_policy ON fill_in_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY fill_in_sets_update_policy ON fill_in_sets
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY fill_in_sets_delete_policy ON fill_in_sets
  FOR DELETE USING (auth.uid() = user_id);

-- fill_in_texts テーブルの RLS ポリシー
CREATE POLICY fill_in_texts_select_policy ON fill_in_texts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY fill_in_texts_insert_policy ON fill_in_texts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY fill_in_texts_update_policy ON fill_in_texts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY fill_in_texts_delete_policy ON fill_in_texts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );

-- fill_in_problems テーブルの RLS ポリシー
CREATE POLICY fill_in_problems_select_policy ON fill_in_problems
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY fill_in_problems_insert_policy ON fill_in_problems
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY fill_in_problems_update_policy ON fill_in_problems
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );
  
CREATE POLICY fill_in_problems_delete_policy ON fill_in_problems
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fill_in_sets 
      WHERE id = set_id AND user_id = auth.uid()
    )
  );

-- user_fill_in_progress テーブルの RLS ポリシー
CREATE POLICY user_fill_in_progress_select_policy ON user_fill_in_progress
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY user_fill_in_progress_insert_policy ON user_fill_in_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY user_fill_in_progress_update_policy ON user_fill_in_progress
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY user_fill_in_progress_delete_policy ON user_fill_in_progress
  FOR DELETE USING (auth.uid() = user_id);

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_fill_in_sets_user_id ON fill_in_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_fill_in_sets_created_at ON fill_in_sets(created_at);
CREATE INDEX IF NOT EXISTS idx_fill_in_texts_set_id ON fill_in_texts(set_id);
CREATE INDEX IF NOT EXISTS idx_fill_in_texts_position ON fill_in_texts(position);
CREATE INDEX IF NOT EXISTS idx_fill_in_problems_set_id ON fill_in_problems(set_id);
CREATE INDEX IF NOT EXISTS idx_user_fill_in_progress_user_id ON user_fill_in_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fill_in_progress_review_date ON user_fill_in_progress(review_date); 