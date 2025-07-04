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
  console.log("Raw text from Gemini API:", text);

  // JSONっぽい部分を探す
  const jsonPattern =
    /\[\s*\{\s*"word"\s*:\s*"[^"]*"\s*,\s*"meaning"\s*:\s*"[^"]*"\s*\}.*\]/s;
  const jsonMatch = text.match(jsonPattern);

  if (jsonMatch) {
    try {
      console.log("Found JSON-like pattern:", jsonMatch[0]);
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse extracted JSON pattern:", e);
    }
  }

  // コードブロック内のJSONを探す (```json ... ```)
  const codeBlockPattern = /```(?:json)?\s*(\[\s*\{[\s\S]*?\}\s*\])\s*```/;
  const codeBlockMatch = text.match(codeBlockPattern);

  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      console.log("Found code block with JSON:", codeBlockMatch[1]);
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      console.error("Failed to parse code block JSON:", e);
    }
  }

  // テキスト全体をJSONとして解析
  try {
    console.log("Trying to parse entire text as JSON");
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse text as JSON:", e);
  }

  // 正規表現で単語と意味のペアを抽出する最後の手段
  try {
    console.log("Attempting to extract word pairs using regex");
    const pairs: Array<{ word: string; meaning: string }> = [];
    const pairPattern = /"?(\w+)"?\s*[:：]\s*"?([^",]+)"?/g;
    let match;

    while ((match = pairPattern.exec(text)) !== null) {
      if (match[1] && match[2]) {
        pairs.push({
          word: match[1].trim(),
          meaning: match[2].trim(),
        });
      }
    }

    if (pairs.length > 0) {
      console.log("Extracted pairs using regex:", pairs);
      return pairs;
    }
  } catch (e) {
    console.error("Failed to extract using regex:", e);
  }

  return [];
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

    const { image, type } = body;

    // ベースパラメータのバリデーション
    if (!image) {
      console.error("No image data provided");
      return new Response(JSON.stringify({ error: "No image data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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

    console.log("Initializing Gemini model...");
    // Geminiモデルの取得（最新のモデル名を使用）
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    console.log("Sending request to Gemini API...");
    // Gemini APIに画像を送信（最新のAPI仕様に対応）
    const prompt = `この画像から英単語とその日本語訳を抽出してください。必ずJSON形式の配列で返してください。形式: [{"word": "apple", "meaning": "りんご"}, {"word": "book", "meaning": "本"}]。見つからない場合は空の配列[]を返してください。`;

    const imagePart = {
      inlineData: {
        data: image,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);

    console.log("Received response from Gemini API");
    // レスポンスを処理
    const response = result.response;
    const text = response.text();
    console.log("Raw text from Gemini API:", text);

    // テキストから単語ペアを抽出
    const wordPairs = extractWordPairsFromText(text);
    console.log("Extracted word pairs:", wordPairs);

    // 結果を返す
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
  } catch (error: unknown) {
    console.error("Error processing request:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // エラーレスポンス
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
