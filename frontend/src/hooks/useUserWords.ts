import { useState, useCallback } from "react";
import { supabase, TABLES } from "../utils/supabase";
import { useAuth } from "../hooks/useAuth";
import type { WordPair, Wordbook, ExtendedWordPair } from "../types";

interface UseUserWordsReturn {
  saveWords: (wordPairs: WordPair[], wordbookTitle?: string) => Promise<string>; // 単語帳IDを返す
  loadWords: (wordbookId?: string) => Promise<ExtendedWordPair[]>;
  loadWordbooks: () => Promise<Wordbook[]>;
  updateWordStatus: (
    userWordId: number,
    mastered: boolean,
    nextReviewDate?: string | null
  ) => Promise<void>;
  createWordbook: (title: string, description?: string) => Promise<string>;
  mergeWordbooks: (sourceIds: string[], targetId: string) => Promise<void>;
  deleteWordbook: (wordbookId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useUserWords = (): UseUserWordsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // 単語を保存（単語帳として）
  const saveWords = async (
    wordPairs: WordPair[],
    wordbookTitle?: string
  ): Promise<string> => {
    if (!user) {
      throw new Error("ログインが必要です");
    }
    setLoading(true);
    setError(null);

    try {
      // 単語帳を作成
      const title =
        wordbookTitle || `単語帳 ${new Date().toLocaleDateString()}`;
      const { data: newWordbook, error: wordbookError } = await supabase
        .from(TABLES.WORDBOOKS)
        .insert({
          user_id: user.id,
          title: title,
          description: `${wordPairs.length}個の単語を含む単語帳`,
        })
        .select("id")
        .single();

      if (wordbookError || !newWordbook) {
        throw new Error("単語帳の作成に失敗しました");
      }

      const wordbookId = newWordbook.id;
      console.log("単語帳作成成功 - wordbookId:", wordbookId, "title:", title);

      // 各単語を保存
      console.log("保存する単語数:", wordPairs.length);
      for (const pair of wordPairs) {
        console.log("単語を処理中:", pair.word, pair.meaning);
        // 既存の単語をチェック
        const { data: existingWords } = await supabase
          .from(TABLES.WORDS)
          .select("id")
          .eq("word", pair.word)
          .eq("meaning", pair.meaning);

        let wordId: number;
        if (existingWords && existingWords.length > 0) {
          wordId = existingWords[0].id;
        } else {
          // 新しい単語を挿入
          const { data: newWord, error: insertError } = await supabase
            .from(TABLES.WORDS)
            .insert({ word: pair.word, meaning: pair.meaning })
            .select("id")
            .single();

          if (insertError || !newWord) {
            console.error("単語の挿入エラー:", insertError);
            continue;
          }
          wordId = newWord.id;
        }

        // 単語帳と単語を関連付け
        await supabase.from(TABLES.WORDBOOK_WORDS).insert({
          wordbook_id: wordbookId,
          word_id: wordId,
        });

        // ユーザーと単語を関連付け（この単語帳専用のレコードを作成）
        const { data: existingUserWords } = await supabase
          .from(TABLES.USER_WORDS)
          .select("id")
          .eq("user_id", user.id)
          .eq("word_id", wordId)
          .eq("wordbook_id", wordbookId);

        if (!existingUserWords || existingUserWords.length === 0) {
          const { error: userWordError } = await supabase
            .from(TABLES.USER_WORDS)
            .insert({
              user_id: user.id,
              word_id: wordId,
              wordbook_id: wordbookId,
              mastered: false,
              review_date: null,
            });

          if (userWordError) {
            console.error("user_wordsの挿入エラー:", userWordError);
          } else {
            console.log(
              "user_wordsレコード作成成功 - wordId:",
              wordId,
              "wordbookId:",
              wordbookId
            );
          }
        }
      }

      return wordbookId.toString();
    } catch (err: unknown) {
      console.error("単語の保存エラー詳細:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "単語の保存中にエラーが発生しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 単語を読み込み（復習対象または特定の単語帳）
  const loadWords = useCallback(
    async (wordbookId?: string): Promise<ExtendedWordPair[]> => {
      if (!user) {
        setError("ログインが必要です");
        return [];
      }
      setLoading(true);
      setError(null);

      try {
        console.log(
          "loadWords開始 - wordbookId:",
          wordbookId,
          "userId:",
          user.id
        );

        // 先にuser_wordsテーブルの状況を確認
        if (wordbookId) {
          const { data: checkData, error: checkError } = await supabase
            .from(TABLES.USER_WORDS)
            .select("*")
            .eq("user_id", user.id)
            .eq("wordbook_id", parseInt(wordbookId));

          console.log("デバッグ: user_wordsテーブルの該当データ:", checkData);
          if (checkError) {
            console.error(
              "デバッグ: user_wordsテーブルチェックエラー:",
              checkError
            );
          }

          if (!checkData || checkData.length === 0) {
            console.log("該当するuser_wordsレコードが見つかりません");
            return [];
          }
        }

        let query = supabase
          .from(TABLES.USER_WORDS)
          .select(
            `
          id,
          word_id,
          mastered,
          review_date,
          wordbook_id,
          words!inner (
            id,
            word,
            meaning
          )
        `
          )
          .eq("user_id", user.id);

        if (wordbookId) {
          // 特定の単語帳の単語を取得
          const parsedId = parseInt(wordbookId);
          console.log("フィルター適用: wordbookId =", parsedId);
          query = query.eq("wordbook_id", parsedId);
        } else {
          // 復習対象の単語を取得（今日以前の復習日または未設定）
          const today = new Date().toISOString().split("T")[0];
          query = query.or(`review_date.lte.${today},review_date.is.null`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error("loadWords - クエリエラー:", fetchError);
          throw fetchError;
        }

        console.log("loadWords - 生データ:", data);
        console.log("loadWords - データ件数:", data?.length || 0);

        if (!data || data.length === 0) {
          console.log("データが空です - 詳細調査中...");

          // 全てのuser_wordsを取得して状況確認
          const { data: allUserWords } = await supabase
            .from(TABLES.USER_WORDS)
            .select("*")
            .eq("user_id", user.id);

          console.log("ユーザーの全user_wordsレコード:", allUserWords);

          return [];
        }

        const wordPairs: ExtendedWordPair[] =
          data
            ?.map((item: any): ExtendedWordPair | null => {
              console.log("Processing item:", item);

              if (!item.words) {
                console.error("words プロパティが見つかりません:", item);
                return null;
              }

              // wordsが配列の場合は最初の要素を取得
              const wordsData = Array.isArray(item.words)
                ? item.words[0]
                : item.words;

              if (!wordsData) {
                console.error("words データが見つかりません:", item);
                return null;
              }

              return {
                word: wordsData.word,
                meaning: wordsData.meaning,
                id: wordsData.id.toString(),
                user_word_id: item.id.toString(),
                mastered: item.mastered,
                reviewDate: item.review_date,
                wordbook_id: item.wordbook_id?.toString(),
              };
            })
            .filter((item): item is ExtendedWordPair => item !== null) || [];

        console.log("loadWords - 処理後データ:", wordPairs);

        return wordPairs;
      } catch (err: unknown) {
        console.error("単語の読み込みエラー詳細:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "単語の読み込み中にエラーが発生しました";
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // 単語帳一覧を取得
  const loadWordbooks = useCallback(async (): Promise<Wordbook[]> => {
    if (!user) {
      setError("ログインが必要です");
      return [];
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from(TABLES.WORDBOOKS)
        .select(
          `
          id,
          user_id,
          title,
          description,
          created_at,
          updated_at,
          wordbook_words (count)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      return (
        data?.map(
          (item: {
            id: number;
            user_id: string;
            title: string;
            description: string | null;
            created_at: string;
            updated_at: string;
            wordbook_words: { count: number }[];
          }) => ({
            id: item.id.toString(),
            user_id: item.user_id,
            title: item.title,
            description: item.description || undefined,
            created_at: item.created_at,
            updated_at: item.updated_at,
            wordCount: item.wordbook_words[0]?.count || 0,
          })
        ) || []
      );
    } catch (err: unknown) {
      console.error("単語帳の読み込みエラー詳細:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "単語帳の読み込み中にエラーが発生しました";
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 単語ステータスを更新（user_words テーブルのIDを使用）
  const updateWordStatus = useCallback(
    async (
      userWordId: number,
      mastered: boolean,
      nextReviewDate: string | null = null
    ): Promise<void> => {
      if (!user) {
        setError("ログインが必要です");
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from(TABLES.USER_WORDS)
          .update({
            mastered: mastered,
            review_date: nextReviewDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userWordId)
          .eq("user_id", user.id); // セキュリティのため

        if (updateError) {
          throw updateError;
        }
      } catch (err: unknown) {
        console.error("単語ステータスの更新エラー詳細:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "単語ステータスの更新中にエラーが発生しました";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // 新しい単語帳を作成
  const createWordbook = async (
    title: string,
    description?: string
  ): Promise<string> => {
    if (!user) {
      throw new Error("ログインが必要です");
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from(TABLES.WORDBOOKS)
        .insert({
          user_id: user.id,
          title: title,
          description: description,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error("単語帳の作成に失敗しました");
      }

      return data.id.toString();
    } catch (err: unknown) {
      console.error("単語帳の作成エラー:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "単語帳の作成中にエラーが発生しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 単語帳を合併
  const mergeWordbooks = async (
    sourceIds: string[],
    targetId: string
  ): Promise<void> => {
    if (!user) {
      throw new Error("ログインが必要です");
    }
    setLoading(true);
    setError(null);

    try {
      // ソース単語帳の全ての単語をターゲット単語帳に移動
      for (const sourceId of sourceIds) {
        await supabase
          .from(TABLES.WORDBOOK_WORDS)
          .update({ wordbook_id: parseInt(targetId) })
          .eq("wordbook_id", parseInt(sourceId));

        await supabase
          .from(TABLES.USER_WORDS)
          .update({ wordbook_id: parseInt(targetId) })
          .eq("wordbook_id", parseInt(sourceId))
          .eq("user_id", user.id);
      }

      // ソース単語帳を削除
      for (const sourceId of sourceIds) {
        await supabase
          .from(TABLES.WORDBOOKS)
          .delete()
          .eq("id", parseInt(sourceId))
          .eq("user_id", user.id);
      }
    } catch (err: unknown) {
      console.error("単語帳の合併エラー:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "単語帳の合併中にエラーが発生しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 単語帳を削除
  const deleteWordbook = async (wordbookId: string): Promise<void> => {
    if (!user) {
      throw new Error("ログインが必要です");
    }
    setLoading(true);
    setError(null);

    try {
      // 関連するuser_wordsのwordbook_idをnullに設定
      await supabase
        .from(TABLES.USER_WORDS)
        .update({ wordbook_id: null })
        .eq("wordbook_id", parseInt(wordbookId))
        .eq("user_id", user.id);

      // 単語帳を削除（wordbook_wordsは外部キー制約で自動削除）
      await supabase
        .from(TABLES.WORDBOOKS)
        .delete()
        .eq("id", parseInt(wordbookId))
        .eq("user_id", user.id);
    } catch (err: unknown) {
      console.error("単語帳の削除エラー:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "単語帳の削除中にエラーが発生しました";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    saveWords,
    loadWords,
    loadWordbooks,
    updateWordStatus,
    createWordbook,
    mergeWordbooks,
    deleteWordbook,
    loading,
    error,
  };
};
