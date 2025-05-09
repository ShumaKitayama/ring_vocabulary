import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 環境変数の読み込み
dotenv.config();

// APIキーの取得（実際のデプロイ時はVercelの環境変数から取得します）
const apiKey = process.env.GEMINI_API_KEY || "your_api_key_here";
console.log(
  "Using API Key:",
  apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5)
); // APIキーの一部のみをログに表示
const genAI = new GoogleGenerativeAI(apiKey);

// Expressアプリケーションの初期化
const app = express();
const port = process.env.PORT || 3001;

// CORSミドルウェアの設定
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://ring-vocabulary.vercel.app", /\.vercel\.app$/]
        : "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// アップロードディレクトリの設定（一時ファイル用）
const isVercel = process.env.VERCEL === "1";
const uploadDir = isVercel
  ? path.join("/tmp", "uploads")
  : path.join(__dirname, "../uploads");

console.log("Upload directory:", uploadDir);
if (!fs.existsSync(uploadDir)) {
  console.log("Creating upload directory...");
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multerのストレージ設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// 単語とその意味のペアを表す型定義
interface WordPair {
  word: string;
  meaning: string;
}

// JSON文字列からワードペアを抽出する関数
function extractWordPairsFromText(text: string): WordPair[] {
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
    const pairs: WordPair[] = [];
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

// APIエンドポイント: OCR処理
app.post(
  "/api/ocr",
  upload.single("image"),
  (req: Request, res: Response, next: NextFunction) => {
    (async () => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "画像がアップロードされていません" });
          return;
        }

        const filePath = req.file.path;

        // 画像をBase64にエンコード
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString("base64");

        // Gemini APIで画像処理
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-pro-exp-03-25",
        });

        // インラインデータとして画像を渡す
        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Image,
              mimeType: req.file.mimetype,
            },
          },
          `この画像から英単語とその日本語訳を抽出してください。必ずJSON形式の配列で返してください。形式: [{"word": "apple", "meaning": "りんご"}, {"word": "book", "meaning": "本"}]。見つからない場合は空の配列[]を返してください。`,
        ]);
        const response = await result.response;
        const text = response.text();
        console.log("Response from Gemini API:", text);

        // 一時ファイルの削除
        fs.unlinkSync(filePath);

        // テキストからJSONを抽出する処理
        const wordPairs = extractWordPairsFromText(text);

        res.status(200).json({
          wordPairs,
          rawText: text,
        });
      } catch (error: any) {
        console.error("OCR処理エラー:", error);
        res.status(500).json({
          error: "OCR処理中にエラーが発生しました",
          details: error.message || "詳細不明",
        });
      }
    })().catch(next);
  }
);

// ヘルスチェック用エンドポイント
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// サーバー起動
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`サーバーが起動しました: http://localhost:${port}`);
  });
}

export default app;
