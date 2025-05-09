"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const generative_ai_1 = require("@google/generative-ai");
// 環境変数の読み込み
dotenv_1.default.config();
// APIキーの取得
const apiKey = process.env.GEMINI_API_KEY || "your_api_key_here";
console.log("Using API Key:", apiKey.length > 10
    ? apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5)
    : "キーが設定されていません");
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
// Expressアプリケーションの初期化
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Vercel用の起動ログ
if (process.env.VERCEL) {
    console.log("Running on Vercel");
}
// CORSミドルウェアの設定
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === "production"
        ? ["https://ring-vocabulary.vercel.app", /\.vercel\.app$/]
        : "http://localhost:5173",
    credentials: true,
}));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// アップロードディレクトリの設定（一時ファイル用）
const isVercel = process.env.VERCEL === "1";
const uploadDir = isVercel
    ? path_1.default.join("/tmp", "uploads")
    : path_1.default.join(__dirname, "../uploads");
console.log("Upload directory:", uploadDir);
if (!fs_1.default.existsSync(uploadDir)) {
    console.log("Creating upload directory...");
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// multerのストレージ設定
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage: storage });
// JSON文字列からワードペアを抽出する関数
function extractWordPairsFromText(text) {
    console.log("Raw text from Gemini API:", text);
    // JSONっぽい部分を探す
    const jsonPattern = /\[\s*\{\s*"word"\s*:\s*"[^"]*"\s*,\s*"meaning"\s*:\s*"[^"]*"\s*\}.*\]/s;
    const jsonMatch = text.match(jsonPattern);
    if (jsonMatch) {
        try {
            console.log("Found JSON-like pattern:", jsonMatch[0]);
            return JSON.parse(jsonMatch[0]);
        }
        catch (e) {
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
        }
        catch (e) {
            console.error("Failed to parse code block JSON:", e);
        }
    }
    // テキスト全体をJSONとして解析
    try {
        console.log("Trying to parse entire text as JSON");
        return JSON.parse(text);
    }
    catch (e) {
        console.error("Failed to parse text as JSON:", e);
    }
    // 正規表現で単語と意味のペアを抽出する最後の手段
    try {
        console.log("Attempting to extract word pairs using regex");
        const pairs = [];
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
    }
    catch (e) {
        console.error("Failed to extract using regex:", e);
    }
    return [];
}
// APIエンドポイント: OCR処理
app.post("/api/ocr", upload.single("image"), (req, res, next) => {
    (async () => {
        try {
            if (!req.file) {
                res.status(400).json({ error: "画像がアップロードされていません" });
                return;
            }
            const filePath = req.file.path;
            // 画像をBase64にエンコード
            const imageBuffer = fs_1.default.readFileSync(filePath);
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
            fs_1.default.unlinkSync(filePath);
            // テキストからJSONを抽出する処理
            const wordPairs = extractWordPairsFromText(text);
            res.status(200).json({
                wordPairs,
                rawText: text,
            });
        }
        catch (error) {
            console.error("OCR処理エラー:", error);
            res.status(500).json({
                error: "OCR処理中にエラーが発生しました",
                details: error.message || "詳細不明",
            });
        }
    })().catch(next);
});
// ルートエンドポイント
app.get("/api", (req, res) => {
    res.status(200).json({ message: "Ring Vocabulary API" });
});
// ヘルスチェック用エンドポイント
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
// サーバー起動（Vercel Functionsでは不要）
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`サーバーが起動しました: http://localhost:${port}`);
    });
}
// モジュールエクスポート
exports.default = app;
// Vercel Functions用のエクスポート
module.exports = app;
