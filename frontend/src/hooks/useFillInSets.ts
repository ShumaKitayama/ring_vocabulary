import { useState, useEffect, useCallback } from "react";
import {
  getFillInSets,
  createFillInSet,
  updateFillInSet,
  deleteFillInSet,
  getFillInSetDetail,
  saveTextsToSet,
  createFillInProblem,
  deleteFillInProblem,
} from "../utils/fillInApi";
import type { FillInSet, FillInSetDetail, FillInText } from "../types";

export const useFillInSets = () => {
  const [sets, setSets] = useState<FillInSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 穴埋め問題セット一覧を取得
  const fetchSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedSets = await getFillInSets();
      setSets(fetchedSets);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "穴埋め問題セットの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // 穴埋め問題セットを作成
  const createSet = useCallback(
    async (title: string, description?: string): Promise<FillInSet | null> => {
      setError(null);
      try {
        const newSet = await createFillInSet(title, description);
        setSets((prev) => [newSet, ...prev]);
        return newSet;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "穴埋め問題セットの作成に失敗しました"
        );
        return null;
      }
    },
    []
  );

  // 穴埋め問題セットを更新
  const updateSet = useCallback(
    async (
      id: string,
      title: string,
      description?: string
    ): Promise<boolean> => {
      setError(null);
      try {
        const updatedSet = await updateFillInSet(id, title, description);
        setSets((prev) =>
          prev.map((set) => (set.id === id ? updatedSet : set))
        );
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "穴埋め問題セットの更新に失敗しました"
        );
        return false;
      }
    },
    []
  );

  // 穴埋め問題セットを削除
  const deleteSet = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await deleteFillInSet(id);
      setSets((prev) => prev.filter((set) => set.id !== id));
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "穴埋め問題セットの削除に失敗しました"
      );
      return false;
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  return {
    sets,
    loading,
    error,
    fetchSets,
    createSet,
    updateSet,
    deleteSet,
  };
};

export const useFillInSetDetail = (setId: string | null) => {
  const [setDetail, setSetDetail] = useState<FillInSetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // セット詳細を取得
  const fetchSetDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getFillInSetDetail(id);
      setSetDetail(detail);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "穴埋め問題セットの詳細取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // テキストをセットに保存
  const saveTexts = useCallback(
    async (
      texts: Omit<FillInText, "id" | "set_id" | "created_at">[]
    ): Promise<boolean> => {
      if (!setId) return false;

      setError(null);
      try {
        await saveTextsToSet(setId, texts);
        // 詳細を再取得
        await fetchSetDetail(setId);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "テキストの保存に失敗しました"
        );
        return false;
      }
    },
    [setId, fetchSetDetail]
  );

  // 穴埋め問題を作成
  const createProblem = useCallback(
    async (
      textId: string,
      correctAnswer: string,
      hint?: string
    ): Promise<boolean> => {
      if (!setId) return false;

      setError(null);
      try {
        await createFillInProblem(setId, textId, correctAnswer, hint);
        // 詳細を再取得
        await fetchSetDetail(setId);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "穴埋め問題の作成に失敗しました"
        );
        return false;
      }
    },
    [setId, fetchSetDetail]
  );

  // 穴埋め問題を削除
  const deleteProblem = useCallback(
    async (problemId: string): Promise<boolean> => {
      if (!setId) return false;

      setError(null);
      try {
        await deleteFillInProblem(problemId);
        // 詳細を再取得
        await fetchSetDetail(setId);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "穴埋め問題の削除に失敗しました"
        );
        return false;
      }
    },
    [setId, fetchSetDetail]
  );

  // セットIDが変更されたら詳細を取得
  useEffect(() => {
    if (setId) {
      fetchSetDetail(setId);
    } else {
      setSetDetail(null);
    }
  }, [setId, fetchSetDetail]);

  return {
    setDetail,
    loading,
    error,
    fetchSetDetail,
    saveTexts,
    createProblem,
    deleteProblem,
  };
};
