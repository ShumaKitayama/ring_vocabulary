-- Ring Vocabulary v1.3用のデータベーススキーマ

-- 単語テーブル
CREATE TABLE IF NOT EXISTS words (
  id BIGSERIAL PRIMARY KEY,
  word TEXT NOT NULL,  -- 英単語
  meaning TEXT NOT NULL, -- 日本語の意味
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- 同じ単語+意味の組み合わせは一度だけ登録できる
  CONSTRAINT unique_word_meaning UNIQUE (word, meaning)
);

-- ユーザーと単語の関連テーブル
CREATE TABLE IF NOT EXISTS user_words (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  mastered BOOLEAN DEFAULT FALSE,  -- 習得済みかどうか
  review_date DATE,  -- 次回の復習日
  review_count INTEGER DEFAULT 0,  -- 復習回数
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- 同じユーザーが同じ単語を重複して持たないようにする
  CONSTRAINT unique_user_word UNIQUE (user_id, word_id)
);

-- ユーザープロファイルテーブル (ユーザー関連の追加情報)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 自動的に updated_at を更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_words テーブルの updated_at 自動更新トリガー
CREATE TRIGGER update_user_words_updated_at
BEFORE UPDATE ON user_words
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- user_profiles テーブルの updated_at 自動更新トリガー
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) ポリシーを設定
-- テーブルのRLSを有効化
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- words テーブルの RLS ポリシー（すべてのユーザーが読み取り可能）
CREATE POLICY words_read_policy ON words
  FOR SELECT USING (true);

-- user_words テーブルの RLS ポリシー（自分のデータのみ操作可能）
CREATE POLICY user_words_select_policy ON user_words
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY user_words_insert_policy ON user_words
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY user_words_update_policy ON user_words
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY user_words_delete_policy ON user_words
  FOR DELETE USING (auth.uid() = user_id);

-- user_profiles テーブルの RLS ポリシー（自分のデータのみ操作可能）
-- サービスロールからのアクセスも許可するよう修正
CREATE POLICY user_profiles_select_policy ON user_profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY user_profiles_insert_policy ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
  
CREATE POLICY user_profiles_update_policy ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- サービスロールからのプロファイル作成を許可するポリシー
CREATE POLICY user_profiles_service_role_policy ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ユーザー登録時に自動的にプロファイルを作成するトリガー
-- SECURITY DEFINERを使ってサービスロールの権限で実行
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- user_profiles テーブルにプロファイルを作成
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 既に存在する場合はエラーを無視
    RETURN NEW;
  WHEN OTHERS THEN
    -- その他のエラーをログに記録
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの削除と再作成
DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;
CREATE TRIGGER create_profile_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_new_user(); 