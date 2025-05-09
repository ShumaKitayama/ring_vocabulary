import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Alert,
  Snackbar,
  Paper,
} from "@mui/material";
import ImageUploader from "../components/ImageUploader";
import WordEditForm from "../components/WordEditForm";
import Flashcard from "../components/Flashcard";
import type { OcrResponse, WordPair } from "../types";

enum AppState {
  UPLOAD, // 画像アップロード画面
  EDIT, // 単語編集画面
  STUDY, // 学習画面
}

const Home = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null); // 選択した画像のURLを保持するstate

  // OCR完了時の処理
  const handleOcrComplete = (result: OcrResponse) => {
    setWordPairs(result.wordPairs);
    if (result.imageUrl) {
      setImageUrl(result.imageUrl);
    }
    setAppState(AppState.EDIT);
  };

  // エラー発生時の処理
  const handleError = (error: unknown) => {
    console.error("アプリケーションエラー:", error);
    setError(
      error instanceof Error ? error.message : "不明なエラーが発生しました"
    );
  };

  // 単語編集完了時の処理
  const handleEditComplete = (editedWordPairs: WordPair[]) => {
    setWordPairs(editedWordPairs);
    setAppState(AppState.STUDY);
  };

  // 学習終了時の処理
  const handleStudyExit = () => {
    setAppState(AppState.UPLOAD);
    setWordPairs([]);
    setImageUrl(null); // 画像URLもリセット
  };

  // スナックバーを閉じる
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Container maxWidth="md" sx={{ display: "flex", justifyContent: "center" }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          borderRadius: 2,
          bgcolor: "white",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Ring Vocabulary
          </Typography>

          <Typography
            variant="subtitle1"
            gutterBottom
            align="center"
            sx={{ mb: 4 }}
          >
            画像から単語を抽出し、フラッシュカードで学習するアプリ
          </Typography>

          {appState === AppState.UPLOAD && (
            <ImageUploader
              onOcrComplete={handleOcrComplete}
              onError={handleError}
            />
          )}

          {appState === AppState.EDIT && (
            <WordEditForm
              initialWordPairs={wordPairs}
              onComplete={handleEditComplete}
              imageUrl={imageUrl} // 画像URLを渡す
            />
          )}

          {appState === AppState.STUDY && (
            <Flashcard wordPairs={wordPairs} onExit={handleStudyExit} />
          )}

          <Snackbar
            open={error !== null}
            autoHideDuration={6000}
            onClose={handleCloseError}
          >
            <Alert onClose={handleCloseError} severity="error">
              {error}
            </Alert>
          </Snackbar>
        </Box>
      </Paper>
    </Container>
  );
};

export default Home;
