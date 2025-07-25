import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { supabase } from "../utils/supabase";
import type { OcrResponse, TextOcrResponse } from "../types";

interface ImageUploaderProps {
  onOcrComplete: (data: OcrResponse) => void;
  onTextOcrComplete?: (data: TextOcrResponse) => void;
  onError: (error: unknown) => void;
}

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

const ImageUploader = ({
  onOcrComplete,
  onTextOcrComplete,
  onError,
}: ImageUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0); // 0: 単語帳, 1: 穴埋め

  // ファイルが選択されたときの処理
  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      // ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(
          `ファイルサイズが大きすぎます（最大${MAX_FILE_SIZE / 1024 / 1024}MB）`
        );
        return;
      }

      // ファイル拡張子チェック
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        setErrorMessage(
          `対応していないファイル形式です（${ALLOWED_EXTENSIONS.join(
            ", "
          )}のみ対応）`
        );
        return;
      }

      // プレビュー表示
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setSelectedFile(file);
      setErrorMessage(null);
    },
    []
  );

  // エラーメッセージをクリア
  const clearError = () => {
    setErrorMessage(null);
  };

  // ファイルをリセット
  const resetFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setUploadProgress(0);
    clearError();
  };

  // OCR処理の実行
  const handleOcr = async () => {
    if (!selectedFile) {
      setErrorMessage("ファイルが選択されていません。");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    clearError();

    try {
      // ファイルをBase64エンコード
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // data:image/jpeg;base64, の部分を削除
          const base64String = result.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(selectedFile);
      });

      setUploadProgress(30);

      // Supabase Edge FunctionでOCR処理
      const mode = selectedTab === 0 ? "vocabulary" : "text";

      const requestBody = {
        image: base64,
        type: selectedFile.type,
        mode,
      };

      const { data, error } = await supabase.functions.invoke<
        OcrResponse | TextOcrResponse
      >("ocr", {
        body: requestBody,
      });

      setUploadProgress(90);

      // エラー処理
      if (error) {
        console.error("OCR function error:", error);
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        // より詳細なエラーメッセージを提供
        let errorMessage = "OCR処理に失敗しました。";

        if (
          error.message.includes("non-2xx status code") ||
          error.message.includes("FunctionsHttpError")
        ) {
          errorMessage =
            "サーバーでエラーが発生しました。画像が正しく認識できないか、サービスが一時的に利用できません。";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "ネットワークエラーが発生しました。インターネット接続を確認してください。";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "処理時間が長すぎます。より小さな画像で試してください。";
        }

        throw new Error(errorMessage);
      }

      // データの検証
      if (!data) {
        console.error("OCR response data is null or undefined");
        throw new Error("OCR処理の結果が取得できませんでした");
      }

      // 処理結果にプレビュー画像のURLを追加
      if (selectedTab === 0) {
        // 単語帳モード
        const ocrData = data as OcrResponse;

        ocrData.imageUrl = preview || undefined;
        onOcrComplete(ocrData);
      } else {
        // 穴埋めモード
        const textData = data as TextOcrResponse;

        textData.imageUrl = preview || undefined;
        if (onTextOcrComplete) {
          onTextOcrComplete(textData);
        } else {
          console.error("onTextOcrComplete callback is not available");
          throw new Error("穴埋めモードのコールバック関数が設定されていません");
        }
      }

      setUploadProgress(100);
    } catch (error) {
      console.error("OCR処理エラー:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "OCR処理中にエラーが発生しました";

      setErrorMessage(errorMessage);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  // ファイルドロップ領域の処理
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // ファイルを選択したときと同様の処理
      const file = files[0];

      // ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(
          `ファイルサイズが大きすぎます（最大${MAX_FILE_SIZE / 1024 / 1024}MB）`
        );
        return;
      }

      // ファイル拡張子チェック
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        setErrorMessage(
          `対応していないファイル形式です（${ALLOWED_EXTENSIONS.join(
            ", "
          )}のみ対応）`
        );
        return;
      }

      // プレビュー表示
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  return (
    <Box sx={{ width: "100%", mt: 3 }}>
      {/* タブ */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="単語帳作成" />
          <Tab label="穴埋め問題作成" />
        </Tabs>
      </Paper>

      {/* 穴埋めタブの準備中表示 */}
      {selectedTab === 1 ? (
        <Card
          sx={{
            textAlign: "center",
            py: 8,
            bgcolor: "grey.50",
            border: "2px dashed",
            borderColor: "grey.300",
          }}
        >
          <CardContent>
            <Typography
              variant="h4"
              sx={{
                mb: 2,
                color: "warning.main",
                fontWeight: "bold",
              }}
            >
              🚧 準備中 🚧
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              穴埋め問題作成機能は現在開発中です
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              より良い学習体験を提供するため、機能の改善を行っています。
              <br />
              しばらくお待ちください。
            </Typography>
            <Chip
              label="Coming Soon"
              color="warning"
              variant="outlined"
              size="medium"
              sx={{ fontSize: "14px", py: 1, px: 2 }}
            />
          </CardContent>
        </Card>
      ) : (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            border: "2px dashed #ccc",
            borderRadius: 2,
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.3s",
            "&:hover": {
              borderColor: "primary.main",
            },
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
              {errorMessage}
            </Alert>
          )}

          {loading && (
            <Box sx={{ width: "100%", mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                OCR処理中... {uploadProgress}%
              </Typography>
            </Box>
          )}

          {preview ? (
            // プレビュー表示
            <Box sx={{ mb: 2 }}>
              <img
                src={preview}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "250px",
                  borderRadius: "8px",
                }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {selectedFile?.name} (
                {selectedFile ? Math.round(selectedFile.size / 1024) : 0} KB)
              </Typography>
            </Box>
          ) : (
            // ファイル選択領域
            <Box sx={{ py: 5 }}>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={onFileChange}
                style={{ display: "none" }}
                id="upload-button"
                disabled={loading}
              />
              <label htmlFor="upload-button">
                <CloudUploadIcon
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h6" gutterBottom>
                  ファイルを選択またはドラッグ&ドロップ
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {selectedTab === 0
                    ? "英単語とその日本語訳が含まれる画像"
                    : "英語の文章が含まれる画像"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  JPG/PNG（最大4MB）
                </Typography>
              </label>
            </Box>
          )}

          {preview && (
            <Box
              sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 2 }}
            >
              <Button variant="outlined" onClick={resetFile} disabled={loading}>
                リセット
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOcr}
                disabled={loading || !selectedFile}
              >
                処理開始
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ImageUploader;
