// @deno-types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.17.1";
import { corsHeaders } from "../_shared/cors.ts";

// Denoの型を定義（型チェックのみの目的）
interface DenoNamespace {
  env: {
    get(key: string): string | undefined;
  };
}

// TypeScript型チェック用に定義
declare const Deno: DenoNamespace;

// 環境変数からAPIキーを取得
const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Google AI Geminiクライアントを初期化
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Supabaseクライアントを初期化
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JSONをパースする関数
function extractWordPairsFromText(
  text: string
): Array<{ word: string; meaning: string }> {
  console.log("Extracting word pairs from text:", text);

  try {
    // まずJSONとして直接パースを試す
    const directParse = JSON.parse(text);
    if (
      Array.isArray(directParse) &&
      directParse.length > 0 &&
      directParse[0].word &&
      directParse[0].meaning
    ) {
      console.log("Successfully parsed as direct JSON:", directParse);
      return directParse;
    }
  } catch (e) {
    console.log("Not a direct JSON, trying other methods...");
  }

  // JSONっぽい部分を探す（より厳密なパターン）
  const jsonPattern = /\[\s*\{[\s\S]*?\}\s*\]/;
  const jsonMatch = text.match(jsonPattern);

  if (jsonMatch) {
    try {
      console.log("Found JSON pattern:", jsonMatch[0]);
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        console.log("Successfully parsed JSON pattern:", parsed);
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse extracted JSON pattern:", e);
    }
  }

  // コードブロック内のJSONを探す
  const codeBlockPattern = /```(?:json)?\s*(\[[\s\S]*?\])\s*```/;
  const codeBlockMatch = text.match(codeBlockPattern);

  if (codeBlockMatch) {
    try {
      console.log("Found code block pattern:", codeBlockMatch[1]);
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (Array.isArray(parsed)) {
        console.log("Successfully parsed code block:", parsed);
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse code block pattern:", e);
    }
  }

  // 正規表現で単語と意味のペアを抽出
  const pairs: Array<{ word: string; meaning: string }> = [];

  // パターン1: "word": "meaning" 形式
  const pattern1 = /"word"\s*:\s*"([^"]+)"\s*,\s*"meaning"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    pairs.push({
      word: match[1].trim(),
      meaning: match[2].trim(),
    });
  }

  if (pairs.length > 0) {
    console.log("Extracted pairs using pattern 1:", pairs);
    return pairs;
  }

  // パターン2: word - meaning 形式
  const lines = text.split("\n");
  for (const line of lines) {
    const linePattern = /^([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*[-:]\s*(.+)$/;
    const lineMatch = line.trim().match(linePattern);
    if (lineMatch) {
      pairs.push({
        word: lineMatch[1].trim(),
        meaning: lineMatch[2].trim(),
      });
    }
  }

  console.log("Final extracted pairs:", pairs);
  return pairs;
}

// 文章を単語・句読点単位で分割する関数
function segmentText(
  text: string
): Array<{ content: string; position: number; isPunctuation: boolean }> {
  console.log("Segmenting text:", text);
  console.log("Text length:", text.length);
  console.log("Text type:", typeof text);

  const segments: Array<{
    content: string;
    position: number;
    isPunctuation: boolean;
  }> = [];

  try {
    // 入力テキストの基本的な検証
    if (!text || typeof text !== "string") {
      console.error("Invalid text input:", text);
      return [
        {
          content: String(text || ""),
          position: 0,
          isPunctuation: false,
        },
      ];
    }

    // 改行や余分な空白を正規化
    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    console.log("Cleaned text:", cleanText);

    // 単語と句読点を分割する正規表現
    // \b は単語境界、[.!?,:;'"()\[\]{}-] は句読点、\s+ は空白
    const regex = /([a-zA-Z]+(?:'[a-zA-Z]+)*|[.!?,:;'"()\[\]{}\-]|\d+)/g;

    let position = 0;
    let match;

    console.log("Starting regex matching...");
    while ((match = regex.exec(cleanText)) !== null) {
      const content = match[1];
      console.log("Found match:", content);

      // 句読点かどうかを判定
      const isPunctuation = /^[.!?,:;'"()\[\]{}\-]$/.test(content);
      console.log("Is punctuation:", isPunctuation);

      segments.push({
        content: content,
        position: position++,
        isPunctuation: isPunctuation,
      });
    }

    console.log("Regex matching completed, segments:", segments.length);

    // セグメントが見つからない場合は、スペース区切りで分割
    if (segments.length === 0) {
      console.log("No segments found with regex, trying space split...");
      const words = cleanText.split(/\s+/);
      console.log("Words from space split:", words);

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word && word.trim()) {
          console.log("Processing word:", word);
          segments.push({
            content: word.trim(),
            position: i,
            isPunctuation: /^[.!?,:;'"()\[\]{}\-]+$/.test(word.trim()),
          });
        }
      }
    }

    console.log("Segmented text result:", segments);
    return segments;
  } catch (error) {
    console.error("Error in segmentText:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : undefined
    );

    // エラーが発生した場合は、文全体を1つのセグメントとして返す
    const fallbackSegment = {
      content: text?.trim() || "",
      position: 0,
      isPunctuation: false,
    };

    console.log("Returning fallback segment:", fallbackSegment);
    return [fallbackSegment];
  }
}

serve(async (req: Request) => {
  console.log("Received request:", {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // OPTIONSリクエスト（Preflightリクエスト）に対応
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // POSTメソッドであることを確認
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // リクエストボディを取得
    let body;
    try {
      body = await req.json();
      console.log("Request body received:", {
        hasImage: !!body.image,
        imageLength: body.image?.length,
        type: body.type,
        mode: body.mode,
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { image, type, mode } = body;

    // ベースパラメータのバリデーション
    if (!image) {
      console.error("No image data provided");
      return new Response(JSON.stringify({ error: "No image data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // modeのバリデーション (vocabulary | text)
    const processingMode = mode || "vocabulary";
    if (!["vocabulary", "text"].includes(processingMode)) {
      console.error("Invalid processing mode:", processingMode);
      return new Response(
        JSON.stringify({
          error: "Invalid processing mode. Use 'vocabulary' or 'text'",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 画像のMIMEタイプを確認
    const mimeType = type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      console.error("Invalid image format:", mimeType);
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 415,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 環境変数のチェック
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not set");
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured",
          details: "Please check your environment variables",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials are not set", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({
          error: "Supabase credentials are not configured",
          details: "Please check your environment variables",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // 環境変数の値をログに出力（機密情報は一部マスク）
    console.log("Environment variables check:", {
      hasGeminiApiKey: !!geminiApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      supabaseUrl: supabaseUrl,
      supabaseServiceKeyMasked: supabaseServiceKey
        ? "***" + supabaseServiceKey.slice(-4)
        : null,
    });

    try {
      console.log("Initializing Gemini model...");
      // Geminiモデルの取得（最新のモデル名を使用）
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      console.log("Sending request to Gemini API...");
      console.log("Processing mode:", processingMode);

      // 処理モードに応じてプロンプトを変更
      let prompt: string;

      if (processingMode === "vocabulary") {
        prompt = `この画像から英単語とその日本語訳を抽出してください。必ずJSON形式の配列で返してください。形式: [{"word": "apple", "meaning": "りんご"}, {"word": "book", "meaning": "本"}]。見つからない場合は空の配列[]を返してください。`;
      } else {
        prompt = `この画像から英語の文章を読み取ってください。画像に写っているテキストをそのまま正確に文字起こししてください。改行や句読点もそのまま再現してください。JSON形式ではなく、プレーンテキストで返してください。`;
      }

      console.log("Using prompt:", prompt.substring(0, 100) + "...");

      const imagePart = {
        inlineData: {
          data: image,
          mimeType: mimeType,
        },
      };

      console.log("Image part prepared, calling Gemini API...");
      const result = await model.generateContent([prompt, imagePart]);

      console.log("Received response from Gemini API");
      // レスポンスを処理
      const response = result.response;
      const text = response.text();
      console.log("Raw text from Gemini API:", text);

      // 処理モードに応じてレスポンスを分岐
      if (processingMode === "vocabulary") {
        // 単語帳モード: 単語ペアを抽出
        console.log("Processing vocabulary mode...");
        const wordPairs = extractWordPairsFromText(text);
        console.log("Extracted word pairs:", wordPairs);

        return new Response(
          JSON.stringify({
            wordPairs,
            rawText: text,
          }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 200,
          }
        );
      } else {
        // 文章モード: テキストを分割
        console.log("Processing text mode...");
        console.log("Raw text for segmentation:", text);

        try {
          const segments = segmentText(text);
          console.log(
            "Segmentation completed, segments count:",
            segments.length
          );
          console.log("Segments:", segments);

          const texts = segments.map((segment, index) => ({
            text_content: segment.content,
            position: segment.position,
            is_punctuation: segment.isPunctuation,
          }));

          console.log("Texts prepared:", texts.length, "items");
          console.log("Final texts structure:", texts);

          return new Response(
            JSON.stringify({
              texts,
              rawText: text,
            }),
            {
              headers: { "Content-Type": "application/json", ...corsHeaders },
              status: 200,
            }
          );
        } catch (segmentError) {
          console.error("Error in text segmentation:", segmentError);
          console.error("Segmentation error details:", {
            message:
              segmentError instanceof Error
                ? segmentError.message
                : String(segmentError),
            stack:
              segmentError instanceof Error ? segmentError.stack : undefined,
            textLength: text.length,
            textPreview: text.substring(0, 100),
          });

          // エラーが発生した場合は、文全体を1つのセグメントとして返す
          const fallbackTexts = [
            {
              text_content: text.trim(),
              position: 0,
              is_punctuation: false,
            },
          ];

          return new Response(
            JSON.stringify({
              texts: fallbackTexts,
              rawText: text,
            }),
            {
              headers: { "Content-Type": "application/json", ...corsHeaders },
              status: 200,
            }
          );
        }
      }
    } catch (geminiError: unknown) {
      console.error("Gemini API Error:", geminiError);
      console.error("Error details:", {
        message:
          geminiError instanceof Error
            ? geminiError.message
            : String(geminiError),
        stack: geminiError instanceof Error ? geminiError.stack : undefined,
      });

      // Gemini APIのエラーを適切に処理
      let errorMessage = "画像処理中にエラーが発生しました";
      let statusCode = 500;

      if (geminiError instanceof Error) {
        if (geminiError.message.includes("quota")) {
          errorMessage =
            "API利用制限に達しました。しばらくしてから再試行してください。";
          statusCode = 429;
        } else if (geminiError.message.includes("invalid")) {
          errorMessage =
            "画像形式が無効です。JPEGまたはPNG形式の画像を使用してください。";
          statusCode = 400;
        } else if (geminiError.message.includes("timeout")) {
          errorMessage =
            "処理時間が長すぎます。より小さな画像で試してください。";
          statusCode = 408;
        }
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details:
            geminiError instanceof Error
              ? geminiError.message
              : String(geminiError),
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: statusCode,
        }
      );
    }
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : undefined
    );

    // 予期しないエラーの処理
    return new Response(
      JSON.stringify({
        error: "サーバー内部エラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
