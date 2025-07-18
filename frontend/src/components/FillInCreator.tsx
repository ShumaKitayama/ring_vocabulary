import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
import {
  PhotoCamera as PhotoCameraIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { useFillInSetDetail } from "../hooks/useFillInSets";
import { performTextOcr } from "../utils/fillInApi";
import type { FillInSet, FillInText } from "../types";

interface FillInCreatorProps {
  selectedSet: FillInSet;
  onBack: () => void;
}

const FillInCreator: React.FC<FillInCreatorProps> = ({
  selectedSet,
  onBack,
}) => {
  const { setDetail, saveTexts, createProblem, error } = useFillInSetDetail(
    selectedSet.id
  );

  // ステップ管理
  const [activeStep, setActiveStep] = useState(0);
  const steps = ["画像をアップロード", "文章を確認", "穴埋め箇所を選択"];

  // 画像とOCR結果の状態
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrTexts, setOcrTexts] = useState<FillInText[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 穴埋め選択の状態
  const [selectedTexts, setSelectedTexts] = useState<Set<string>>(new Set());
  const [savingProblems, setSavingProblems] = useState(false);

  // 問題作成完了ダイアログ
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [createdProblemsCount, setCreatedProblemsCount] = useState(0);

  // ファイル選択処理
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      console.log("Selected file:", file.name, file.type, file.size);

      // ファイルサイズとタイプの確認
      const maxSize = 4 * 1024 * 1024; // 4MB
      if (file.size > maxSize) {
        const errorMsg = "ファイルサイズが4MBを超えています";
        console.error(errorMsg);
        setOcrError(errorMsg);
        return;
      }

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        const errorMsg = "対応していないファイル形式です（JPEG、PNGのみ対応）";
        console.error(errorMsg);
        setOcrError(errorMsg);
        return;
      }

      // プレビュー表示
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setSelectedFile(file);
      setOcrError(null);
      setUploadProgress(0);
    },
    []
  );

  // OCR処理実行
  const handleOcrProcess = async () => {
    if (!selectedFile) return;

    console.log("Starting OCR process for fill-in problems");
    setLoading(true);
    setOcrError(null);
    setUploadProgress(0);

    try {
      // 進捗表示を更新
      setUploadProgress(10);
      console.log("Progress: 10% - Starting file processing");

      setUploadProgress(30);
      console.log("Progress: 30% - Sending to OCR API");

      // OCR処理を実行
      const result = await performTextOcr(selectedFile);

      console.log("OCR API response received:", result);
      setUploadProgress(70);
      console.log("Progress: 70% - Processing OCR results");

      // レスポンスの検証
      if (!result || !result.texts) {
        throw new Error("OCR処理の結果が不正です");
      }

      if (result.texts.length === 0) {
        throw new Error(
          "画像から文章が検出されませんでした。より鮮明な画像を使用してください。"
        );
      }

      // FillInTextの形式に変換
      const texts: FillInText[] = result.texts.map((text, index) => ({
        id: `temp_${index}`, // 一時的なID
        set_id: selectedSet.id,
        text_content: text.text_content,
        position: text.position,
        is_punctuation: text.is_punctuation,
        created_at: new Date().toISOString(),
      }));

      console.log("Converted texts:", texts);
      setUploadProgress(90);
      console.log("Progress: 90% - Finalizing");

      setOcrTexts(texts);
      setUploadProgress(100);
      console.log("Progress: 100% - OCR completed successfully");

      // 少し待ってから次のステップに進む
      setTimeout(() => {
        setActiveStep(1);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      console.error("OCR処理エラー:", err);
      console.error("Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      let errorMessage = "画像の読み取りに失敗しました";

      if (err instanceof Error) {
        if (
          err.message.includes("timeout") ||
          err.message.includes("タイムアウト")
        ) {
          errorMessage =
            "OCR処理がタイムアウトしました。より小さな画像で試してください。";
        } else if (
          err.message.includes("network") ||
          err.message.includes("ネットワーク")
        ) {
          errorMessage =
            "ネットワークエラーが発生しました。インターネット接続を確認してください。";
        } else if (
          err.message.includes("quota") ||
          err.message.includes("制限")
        ) {
          errorMessage =
            "API利用制限に達しました。しばらくしてから再試行してください。";
        } else if (
          err.message.includes("format") ||
          err.message.includes("形式")
        ) {
          errorMessage =
            "画像形式が正しくありません。JPEGまたはPNG形式の画像を使用してください。";
        } else if (err.message.includes("検出されませんでした")) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }

      setOcrError(errorMessage);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // テキストをセットに保存
  const handleSaveTexts = async () => {
    if (ocrTexts.length === 0) return;

    setLoading(true);
    try {
      await saveTexts(
        ocrTexts.map((text) => ({
          text_content: text.text_content,
          position: text.position,
          is_punctuation: text.is_punctuation,
        }))
      );
      setActiveStep(2); // 次のステップに進む
    } catch (err) {
      console.error("Text save error:", err);
      setOcrError(
        err instanceof Error ? err.message : "テキストの保存に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  // 穴埋め箇所の選択/選択解除
  const handleTextSelect = (textId: string) => {
    setSelectedTexts((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(textId)) {
        newSelected.delete(textId);
      } else {
        newSelected.add(textId);
      }
      return newSelected;
    });
  };

  // 穴埋め問題を作成
  const handleCreateProblems = async () => {
    if (selectedTexts.size === 0 || !setDetail) return;

    setSavingProblems(true);
    let successCount = 0;

    try {
      for (const textId of selectedTexts) {
        const text = setDetail.texts.find((t) => t.id === textId);
        if (text && !text.is_punctuation) {
          try {
            await createProblem(text.id, text.text_content);
            successCount++;
          } catch (err) {
            console.error(`Failed to create problem for text ${textId}:`, err);
          }
        }
      }

      setCreatedProblemsCount(successCount);
      setCompletionDialogOpen(true);
    } finally {
      setSavingProblems(false);
    }
  };

  // 完了処理
  const handleComplete = () => {
    setCompletionDialogOpen(false);
    onBack();
  };

  // ステップ1: 画像アップロード
  const renderImageUploadStep = () => (
    <Box textAlign="center">
      <Typography variant="h6" gutterBottom>
        文章が写っている画像を選択してください
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        英語の文章を含む画像（JPEG、PNG、最大4MB）
      </Typography>

      {ocrError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {ocrError}
        </Alert>
      )}

      {loading && (
        <Box sx={{ width: "100%", mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ height: 8, borderRadius: 4, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            OCR処理中... {uploadProgress}%
          </Typography>
        </Box>
      )}

      <input
        accept="image/jpeg,image/jpg,image/png"
        style={{ display: "none" }}
        id="image-upload"
        type="file"
        onChange={handleFileSelect}
      />
      <label htmlFor="image-upload">
        <Button
          variant="outlined"
          component="span"
          startIcon={<PhotoCameraIcon />}
          size="large"
          sx={{ mb: 3 }}
          disabled={loading}
        >
          画像を選択
        </Button>
      </label>

      {preview && (
        <Box>
          <Paper elevation={3} sx={{ p: 2, mb: 3, maxWidth: 600, mx: "auto" }}>
            <img
              src={preview}
              alt="Selected"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "400px",
                objectFit: "contain",
              }}
            />
          </Paper>
          <Button
            variant="contained"
            onClick={handleOcrProcess}
            disabled={loading}
            size="large"
          >
            {loading ? <CircularProgress size={24} /> : "文章を読み取る"}
          </Button>
        </Box>
      )}
    </Box>
  );

  // ステップ2: 文章確認
  const renderTextConfirmStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        読み取った文章を確認してください
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        正しく読み取れていることを確認してから次に進んでください
      </Typography>

      <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: "grey.50" }}>
        <Typography variant="body1" sx={{ lineHeight: 2 }}>
          {ocrTexts.map((text, index) => (
            <span
              key={index}
              style={{ marginRight: text.is_punctuation ? 0 : 4 }}
            >
              {text.text_content}
            </span>
          ))}
        </Typography>
      </Paper>

      <Box display="flex" gap={2}>
        <Button variant="outlined" onClick={() => setActiveStep(0)}>
          画像を選び直す
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveTexts}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "次へ進む"}
        </Button>
      </Box>
    </Box>
  );

  // ステップ3: 穴埋め箇所選択
  const renderProblemSelectionStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        穴埋めにしたい単語をクリックしてください
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        選択した単語が穴埋め問題になります（{selectedTexts.size}個選択中）
      </Typography>

      {setDetail && (
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: "grey.50" }}>
          <Box sx={{ lineHeight: 2.5 }}>
            {setDetail.texts.map((text) => (
              <React.Fragment key={text.id}>
                {text.is_punctuation ? (
                  <span style={{ marginRight: 0 }}>{text.text_content}</span>
                ) : (
                  <Chip
                    label={text.text_content}
                    onClick={() => handleTextSelect(text.id)}
                    color={selectedTexts.has(text.id) ? "primary" : "default"}
                    variant={selectedTexts.has(text.id) ? "filled" : "outlined"}
                    sx={{
                      margin: "0 2px 4px 0",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: selectedTexts.has(text.id)
                          ? "primary.dark"
                          : "action.hover",
                      },
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </Box>
        </Paper>
      )}

      <Box display="flex" gap={2}>
        <Button variant="outlined" onClick={() => setActiveStep(1)}>
          戻る
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateProblems}
          disabled={selectedTexts.size === 0 || savingProblems}
          startIcon={
            savingProblems ? <CircularProgress size={20} /> : <SaveIcon />
          }
        >
          {savingProblems ? "作成中..." : `${selectedTexts.size}個の問題を作成`}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mr: 2 }}>
          戻る
        </Button>
        <Typography variant="h5">
          {selectedSet.title} - 穴埋め問題作成
        </Typography>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ステッパー */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* ステップ内容 */}
      <Paper elevation={2} sx={{ p: 4 }}>
        {activeStep === 0 && renderImageUploadStep()}
        {activeStep === 1 && renderTextConfirmStep()}
        {activeStep === 2 && renderProblemSelectionStep()}
      </Paper>

      {/* 完了ダイアログ */}
      <Dialog open={completionDialogOpen} onClose={handleComplete}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CheckIcon color="success" sx={{ mr: 1 }} />
            穴埋め問題作成完了
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            {createdProblemsCount}個の穴埋め問題を作成しました。
            <br />
            学習ページで練習できます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleComplete} variant="contained">
            完了
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FillInCreator;
