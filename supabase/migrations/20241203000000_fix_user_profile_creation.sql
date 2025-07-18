-- 新規ユーザー作成時のプロファイル作成問題を修正

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;

-- 既存のトリガー関数を削除
DROP FUNCTION IF EXISTS create_profile_for_new_user();

-- サービスロールからのプロファイル作成を許可するポリシーを追加
DROP POLICY IF EXISTS user_profiles_service_role_policy ON user_profiles;
CREATE POLICY user_profiles_service_role_policy ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 新しいトリガー関数を作成（SECURITY DEFINERを使用）
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

-- 新しいトリガーを作成
CREATE TRIGGER create_profile_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_new_user();

-- 関数の実行権限を設定
GRANT EXECUTE ON FUNCTION create_profile_for_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION create_profile_for_new_user() TO anon;
GRANT EXECUTE ON FUNCTION create_profile_for_new_user() TO service_role; 