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
  console.log("performTextOcr called with file:", {
    name: imageFile.name,
    size: imageFile.size,
    type: imageFile.type,
  });

  try {
    // ファイルをBase64エンコード
    console.log("Starting Base64 encoding...");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.split(",")[1];
        console.log("Base64 encoding completed, length:", base64String.length);
        resolve(base64String);
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(new Error("ファイルの読み込みに失敗しました"));
      };
      reader.readAsDataURL(imageFile);
    });

    // タイムアウト処理付きのOCR API呼び出し
    const timeoutMs = 30000; // 30秒タイムアウト
    console.log("Sending OCR request with timeout:", timeoutMs, "ms");

    const requestBody = {
      image: base64,
      type: imageFile.type,
      mode: "text", // 文章読み取りモード
    };

    console.log("Request body prepared:", {
      imageLength: base64.length,
      type: imageFile.type,
      mode: "text",
    });

    const ocrPromise = supabase.functions.invoke<TextOcrResponse>("ocr", {
      body: requestBody,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error("OCR request timed out after", timeoutMs, "ms");
        reject(
          new Error(
            "OCR処理がタイムアウトしました。より小さな画像で試してください。"
          )
        );
      }, timeoutMs);
    });

    console.log("Starting OCR API call...");
    const startTime = Date.now();
    const { data, error } = await Promise.race([ocrPromise, timeoutPromise]);
    const endTime = Date.now();

    console.log("OCR API call completed in", endTime - startTime, "ms");
    console.log("OCR response:", {
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message,
      dataKeys: data ? Object.keys(data) : null,
    });

    if (error) {
      console.error("OCR API error:", error);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      // エラーの種類に応じたメッセージを提供
      let errorMessage = "OCR処理に失敗しました";

      if (error.message.includes("FunctionsHttpError")) {
        errorMessage =
          "画像の解析に失敗しました。画像が鮮明でない可能性があります。";
      } else if (error.message.includes("non-2xx status code")) {
        errorMessage =
          "サーバーでエラーが発生しました。しばらくしてから再試行してください。";
      } else if (error.message.includes("network")) {
        errorMessage =
          "ネットワークエラーが発生しました。インターネット接続を確認してください。";
      } else if (error.message.includes("timeout")) {
        errorMessage = "処理時間が長すぎます。より小さな画像で試してください。";
      } else if (error.message.includes("quota")) {
        errorMessage =
          "API利用制限に達しました。しばらくしてから再試行してください。";
      } else {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }

    if (!data) {
      console.error("OCR response data is null");
      throw new Error("OCR処理の結果が取得できませんでした");
    }

    console.log("OCR data validation:", {
      hasTexts: !!data.texts,
      textsLength: data.texts?.length || 0,
      hasRawText: !!data.rawText,
      rawTextLength: data.rawText?.length || 0,
    });

    // データの妥当性をチェック
    if (!data.texts || !Array.isArray(data.texts)) {
      console.error("Invalid OCR response structure:", data);
      throw new Error("OCR処理の結果が不正な形式です");
    }

    if (data.texts.length === 0) {
      console.warn("No texts found in OCR response");
      throw new Error(
        "画像から文章が検出されませんでした。より鮮明な画像を使用してください。"
      );
    }

    console.log("OCR processing completed successfully");
    return data;
  } catch (error) {
    console.error("performTextOcr error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : undefined
    );

    // エラーを再スローする前に、わかりやすいメッセージに変換
    if (error instanceof Error) {
      throw error; // 既に適切なエラーメッセージが設定されている場合はそのまま
    } else {
      throw new Error("予期しないエラーが発生しました");
    }
  }
}
