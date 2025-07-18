import { supabase, TABLES } from "./supabase";
import type {
  FillInSet,
  FillInText,
  FillInProblem,
  ExtendedFillInProblem,
  FillInSetDetail,
  UserFillInProgress,
  TextOcrResponse,
} from "../types";

// 穴埋め問題セット関連の関数

// 穴埋め問題セット一覧を取得
export async function getFillInSets(): Promise<FillInSet[]> {
  const { data, error } = await supabase
    .from(TABLES.FILL_IN_SETS)
    .select(
      `
      *,
      problems:fill_in_problems(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching fill-in sets:", error);
    throw error;
  }

  return data.map((set: FillInSet & { problems: { count: number }[] }) => ({
    ...set,
    problemCount: set.problems[0]?.count || 0,
  }));
}

// 穴埋め問題セットを作成
export async function createFillInSet(
  title: string,
  description?: string
): Promise<FillInSet> {
  const { data, error } = await supabase
    .from(TABLES.FILL_IN_SETS)
    .insert({
      title,
      description,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating fill-in set:", error);
    throw error;
  }

  return data;
}

// 穴埋め問題セットを更新
export async function updateFillInSet(
  id: string,
  title: string,
  description?: string
): Promise<FillInSet> {
  const { data, error } = await supabase
    .from(TABLES.FILL_IN_SETS)
    .update({ title, description })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating fill-in set:", error);
    throw error;
  }

  return data;
}

// 穴埋め問題セットを削除
export async function deleteFillInSet(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.FILL_IN_SETS)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting fill-in set:", error);
    throw error;
  }
}

// 穴埋め問題セットの詳細を取得（テキストと問題を含む）
export async function getFillInSetDetail(
  setId: string
): Promise<FillInSetDetail> {
  // セット情報を取得
  const { data: setData, error: setError } = await supabase
    .from(TABLES.FILL_IN_SETS)
    .select("*")
    .eq("id", setId)
    .single();

  if (setError) {
    console.error("Error fetching fill-in set:", setError);
    throw setError;
  }

  // テキストを取得
  const { data: textsData, error: textsError } = await supabase
    .from(TABLES.FILL_IN_TEXTS)
    .select("*")
    .eq("set_id", setId)
    .order("position");

  if (textsError) {
    console.error("Error fetching fill-in texts:", textsError);
    throw textsError;
  }

  // 問題を取得（進捗情報も含む）
  const { data: problemsData, error: problemsError } = await supabase
    .from(TABLES.FILL_IN_PROBLEMS)
    .select(
      `
      *,
      text:fill_in_texts(*),
      progress:user_fill_in_progress(*)
    `
    )
    .eq("set_id", setId);

  if (problemsError) {
    console.error("Error fetching fill-in problems:", problemsError);
    throw problemsError;
  }

  return {
    ...setData,
    texts: textsData,
    problems: problemsData.map(
      (
        problem: FillInProblem & {
          text: FillInText;
          progress: UserFillInProgress[];
        }
      ) => ({
        ...problem,
        text: problem.text,
        progress: problem.progress[0] || null,
      })
    ),
  };
}

// テキスト関連の関数

// 読み取ったテキストをセットに保存
export async function saveTextsToSet(
  setId: string,
  texts: Omit<FillInText, "id" | "set_id" | "created_at">[]
): Promise<FillInText[]> {
  const textsWithSetId = texts.map((text) => ({
    ...text,
    set_id: setId,
  }));

  const { data, error } = await supabase
    .from(TABLES.FILL_IN_TEXTS)
    .insert(textsWithSetId)
    .select();

  if (error) {
    console.error("Error saving texts to set:", error);
    throw error;
  }

  return data;
}

// 穴埋め問題関連の関数

// 穴埋め問題を作成
export async function createFillInProblem(
  setId: string,
  textId: string,
  correctAnswer: string,
  hint?: string
): Promise<FillInProblem> {
  const { data, error } = await supabase
    .from(TABLES.FILL_IN_PROBLEMS)
    .insert({
      set_id: setId,
      text_id: textId,
      correct_answer: correctAnswer,
      hint,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating fill-in problem:", error);
    throw error;
  }

  return data;
}

// 穴埋め問題を削除
export async function deleteFillInProblem(problemId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.FILL_IN_PROBLEMS)
    .delete()
    .eq("id", problemId);

  if (error) {
    console.error("Error deleting fill-in problem:", error);
    throw error;
  }
}

// 学習進捗関連の関数

// ユーザーの回答を記録
export async function recordFillInAnswer(
  problemId: string,
  userAnswer: string,
  isCorrect: boolean
): Promise<UserFillInProgress> {
  // 既存の進捗を確認
  const { data: existingProgress } = await supabase
    .from(TABLES.USER_FILL_IN_PROGRESS)
    .select("*")
    .eq("problem_id", problemId)
    .single();

  let progressData;

  if (existingProgress) {
    // 既存の進捗を更新
    const updateData = {
      last_answer: userAnswer,
      is_correct: isCorrect,
      correct_count: isCorrect
        ? existingProgress.correct_count + 1
        : existingProgress.correct_count,
      incorrect_count: isCorrect
        ? existingProgress.incorrect_count
        : existingProgress.incorrect_count + 1,
      mastered:
        isCorrect && existingProgress.correct_count + 1 >= 3 ? true : false,
    };

    const { data, error } = await supabase
      .from(TABLES.USER_FILL_IN_PROGRESS)
      .update(updateData)
      .eq("id", existingProgress.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating fill-in progress:", error);
      throw error;
    }

    progressData = data;
  } else {
    // 新規の進捗を作成
    const { data, error } = await supabase
      .from(TABLES.USER_FILL_IN_PROGRESS)
      .insert({
        problem_id: problemId,
        last_answer: userAnswer,
        is_correct: isCorrect,
        correct_count: isCorrect ? 1 : 0,
        incorrect_count: isCorrect ? 0 : 1,
        mastered: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating fill-in progress:", error);
      throw error;
    }

    progressData = data;
  }

  return progressData;
}

// 学習用の問題を取得（復習対象の問題を優先）
export async function getStudyProblems(
  setId: string,
  limit?: number
): Promise<ExtendedFillInProblem[]> {
  let query = supabase
    .from(TABLES.FILL_IN_PROBLEMS)
    .select(
      `
      *,
      text:fill_in_texts(*),
      progress:user_fill_in_progress(*)
    `
    )
    .eq("set_id", setId);

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching study problems:", error);
    throw error;
  }

  return data.map(
    (
      problem: FillInProblem & {
        text: FillInText;
        progress: UserFillInProgress[];
      }
    ) => ({
      ...problem,
      text: problem.text,
      progress: problem.progress[0] || null,
    })
  );
}

// OCR関連の関数

// 文章読み取りOCRを実行
export async function performTextOcr(
  imageFile: File
): Promise<TextOcrResponse> {
  // ファイルをBase64エンコード
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });

  // タイムアウト処理付きのOCR API呼び出し
  const timeoutMs = 30000; // 30秒タイムアウト

  const ocrPromise = supabase.functions.invoke<TextOcrResponse>("ocr", {
    body: {
      image: base64,
      type: imageFile.type,
      mode: "text", // 文章読み取りモード
    },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          "OCR処理がタイムアウトしました。より小さな画像で試してください。"
        )
      );
    }, timeoutMs);
  });

  const { data, error } = await Promise.race([ocrPromise, timeoutPromise]);

  if (error) {
    console.error("Text OCR error:", error);
    throw error;
  }

  if (!data) {
    throw new Error("OCR response data is null");
  }

  return data;
}
