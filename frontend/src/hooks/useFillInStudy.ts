import { useState, useCallback } from "react";
import { getStudyProblems, recordFillInAnswer } from "../utils/fillInApi";
import type { ExtendedFillInProblem, FillInStudySession } from "../types";

export const useFillInStudy = () => {
  const [session, setSession] = useState<FillInStudySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 学習セッションを開始
  const startStudySession = useCallback(
    async (setId: string, limit?: number) => {
      setLoading(true);
      setError(null);
      try {
        const problems = await getStudyProblems(setId, limit);

        if (problems.length === 0) {
          setError("学習する問題がありません");
          return false;
        }

        // 未習得の問題を優先し、ランダムにシャッフル
        const sortedProblems = problems.sort((a, b) => {
          // 未習得を優先
          if (a.progress?.mastered !== b.progress?.mastered) {
            return a.progress?.mastered ? 1 : -1;
          }
          // 正解率の低い問題を優先
          const aSuccessRate = a.progress
            ? a.progress.correct_count /
              (a.progress.correct_count + a.progress.incorrect_count)
            : 0;
          const bSuccessRate = b.progress
            ? b.progress.correct_count /
              (b.progress.correct_count + b.progress.incorrect_count)
            : 0;
          return aSuccessRate - bSuccessRate;
        });

        setSession({
          set_id: setId,
          problems: sortedProblems,
          currentIndex: 0,
          userAnswers: {},
          results: {},
        });

        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "学習セッションの開始に失敗しました"
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 回答を提出
  const submitAnswer = useCallback(
    async (answer: string): Promise<boolean> => {
      if (!session) return false;

      const currentProblem = session.problems[session.currentIndex];
      if (!currentProblem) return false;

      setError(null);
      try {
        // 正解かどうかを判定（大文字小文字を無視し、前後の空白をトリム）
        const isCorrect =
          answer.trim().toLowerCase() ===
          currentProblem.correct_answer.trim().toLowerCase();

        // 回答を記録
        await recordFillInAnswer(currentProblem.id, answer, isCorrect);

        // セッションを更新
        setSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            userAnswers: {
              ...prev.userAnswers,
              [currentProblem.id]: answer,
            },
            results: {
              ...prev.results,
              [currentProblem.id]: isCorrect,
            },
          };
        });

        return isCorrect;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "回答の記録に失敗しました"
        );
        return false;
      }
    },
    [session]
  );

  // 次の問題に進む
  const nextProblem = useCallback(() => {
    if (!session) return false;

    if (session.currentIndex < session.problems.length - 1) {
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
        };
      });
      return true;
    }
    return false; // 最後の問題の場合
  }, [session]);

  // 前の問題に戻る
  const previousProblem = useCallback(() => {
    if (!session) return false;

    if (session.currentIndex > 0) {
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: prev.currentIndex - 1,
        };
      });
      return true;
    }
    return false; // 最初の問題の場合
  }, [session]);

  // 特定の問題に移動
  const goToProblem = useCallback(
    (index: number) => {
      if (!session || index < 0 || index >= session.problems.length)
        return false;

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: index,
        };
      });
      return true;
    },
    [session]
  );

  // セッションを終了
  const endSession = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  // 現在の問題を取得
  const getCurrentProblem = useCallback((): ExtendedFillInProblem | null => {
    if (!session) return null;
    return session.problems[session.currentIndex] || null;
  }, [session]);

  // セッションの統計情報を取得
  const getSessionStats = useCallback(() => {
    if (!session) return null;

    const answeredCount = Object.keys(session.userAnswers).length;
    const correctCount = Object.values(session.results).filter(
      (result) => result
    ).length;
    const incorrectCount = answeredCount - correctCount;

    return {
      totalProblems: session.problems.length,
      answeredCount,
      correctCount,
      incorrectCount,
      remainingCount: session.problems.length - answeredCount,
      accuracy: answeredCount > 0 ? (correctCount / answeredCount) * 100 : 0,
      isCompleted: answeredCount === session.problems.length,
    };
  }, [session]);

  // ユーザーの回答を取得
  const getUserAnswer = useCallback(
    (problemId: string): string | undefined => {
      return session?.userAnswers[problemId];
    },
    [session]
  );

  // 問題の結果を取得
  const getProblemResult = useCallback(
    (problemId: string): boolean | undefined => {
      return session?.results[problemId];
    },
    [session]
  );

  return {
    session,
    loading,
    error,
    startStudySession,
    submitAnswer,
    nextProblem,
    previousProblem,
    goToProblem,
    endSession,
    getCurrentProblem,
    getSessionStats,
    getUserAnswer,
    getProblemResult,
  };
};
