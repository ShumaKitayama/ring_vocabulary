// @deno-types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.0";
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
const supabaseUrl = Deno.env.get("DB_URL") || "";
const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || "";

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

interface RequestEvent {
  request: Request;
  url: URL;
}

serve(async (req: Request) => {
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
    const { image, type } = await req.json();

    // ベースパラメータのバリデーション
    if (!image) {
      return new Response(JSON.stringify({ error: "No image data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 画像のMIMEタイプを確認
    const mimeType = type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 415,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Geminiモデルの取得
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    // Gemini APIに画像を送信
    const result = await model.generateContent([
      {
        inlineData: {
          data: image,
          mimeType: mimeType,
        },
      },
      `この画像から英単語とその日本語訳を抽出してください。必ずJSON形式の配列で返してください。形式: [{"word": "apple", "meaning": "りんご"}, {"word": "book", "meaning": "本"}]。見つからない場合は空の配列[]を返してください。`,
    ]);

    // レスポンスを処理
    const response = await result.response;
    const text = response.text();

    // テキストから単語ペアを抽出
    const wordPairs = extractWordPairsFromText(text);

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

    // エラーレスポンス
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
