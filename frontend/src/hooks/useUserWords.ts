import { useState } from "react";
import { supabase, TABLES } from "../utils/supabase";
import { useAuth } from "../hooks/useAuth";
import type { WordPair } from "../types";

interface UseUserWordsReturn {
  saveWords: (wordPairs: WordPair[]) => Promise<void>;
  loadWords: () => Promise<WordPair[]>;
  updateWordStatus: (
    wordId: number,
    mastered: boolean,
    nextReviewDate?: string | null
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
}

// selectで取得するカラムのみを定義
interface UserWordItem {
  id: number;
  mastered: boolean;
  review_date: string | null;
}

export const useUserWords = (): UseUserWordsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const saveWords = async (wordPairs: WordPair[]): Promise<void> => {
    if (!user) {
      setError("ログインが必要です");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      for (const pair of wordPairs) {
        const { data: existingWords } = await supabase
          .from(TABLES.WORDS)
          .select("id")
          .eq("word", pair.word)
          .eq("meaning", pair.meaning);
        let wordId: number;
        if (existingWords && existingWords.length > 0) {
          wordId = existingWords[0].id;
        } else {
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
        const { data: existingUserWords } = await supabase
          .from(TABLES.USER_WORDS)
          .select("id")
          .eq("user_id", user.id)
          .eq("word_id", wordId);
        if (!existingUserWords || existingUserWords.length === 0) {
          const { error: relationError } = await supabase
            .from(TABLES.USER_WORDS)
            .insert({
              user_id: user.id,
              word_id: wordId,
              mastered: false,
              review_date: null,
            });
          if (relationError) {
            console.error("ユーザーと単語の関連付けエラー:", relationError);
          }
        }
      }
    } catch (err: unknown) {
      console.error("単語の保存エラー詳細:", JSON.stringify(err, null, 2));
      let errorMessage = "単語の保存中にエラーが発生しました";
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async (): Promise<WordPair[]> => {
    if (!user) {
      setError("ログインが必要です");
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      // 関連テーブルの読み込みを一時的に削除してエラーを切り分け
      const { data, error: fetchError } = await supabase
        .from(TABLES.USER_WORDS)
        .select(
          `
          id,
          mastered,
          review_date
        `
        ) // 正しいバッククォートを使用
        .eq("user_id", user.id)
        .or(`review_date.lte.${today},review_date.is.null`); // 正しいバッククォートを使用

      if (fetchError) {
        throw fetchError;
      }

      const wordPairs: WordPair[] =
        data?.map((item: UserWordItem) => {
          return {
            word: "", // 関連データがないためプレースホルダー
            meaning: "", // 関連データがないためプレースホルダー
            id: item.id.toString(),
            mastered: item.mastered,
            reviewDate: item.review_date,
          };
        }) || [];
      return wordPairs;
    } catch (err: unknown) {
      console.error("単語の読み込みエラー詳細:", JSON.stringify(err, null, 2));
      let errorMessage = "単語の読み込み中にエラーが発生しました";
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        errorMessage = (err as { message: string }).message;
        if (
          "details" in err &&
          typeof (err as { details: unknown }).details === "string"
        ) {
          errorMessage += ` (詳細: ${(err as { details: string }).details})`;
        }
        if (
          "hint" in err &&
          typeof (err as { hint: unknown }).hint === "string"
        ) {
          errorMessage += ` (ヒント: ${(err as { hint: string }).hint})`;
        }
      }
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateWordStatus = async (
    wordId: number,
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
        .eq("user_id", user.id)
        .eq("word_id", wordId);
      if (updateError) {
        throw updateError;
      }
    } catch (err: unknown) {
      console.error(
        "単語ステータスの更新エラー詳細:",
        JSON.stringify(err, null, 2)
      );
      let errorMessage = "単語ステータスの更新中にエラーが発生しました";
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    saveWords,
    loadWords,
    updateWordStatus,
    loading,
    error,
  };
};
