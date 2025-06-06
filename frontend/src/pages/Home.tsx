import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Alert,
  Snackbar,
  Paper,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import ImageUploader from "../components/ImageUploader";
import WordEditForm from "../components/WordEditForm";
import Flashcard from "../components/Flashcard";
import { useUserWords } from "../hooks/useUserWords";
import type { OcrResponse, WordPair } from "../types";

enum AppState {
  UPLOAD, // 画像アップロード画面
  EDIT, // 単語編集画面
  STUDY, // 学習画面
  REVIEW, // 復習画面
}

const Home = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null); // 選択した画像のURLを保持するstate
  const [loading, setLoading] = useState(false);

  // 単語データフック
  const { loadWords } = useUserWords();

  // 単語データの読み込み
  useEffect(() => {
    const fetchUserWords = async () => {
      setLoading(true);
      try {
        const userWords = await loadWords();
        console.log("ユーザーの単語:", userWords);
      } catch (err) {
        console.error("単語データ読み込みエラー:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserWords();
  }, [loadWords]);

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

  // 復習モード開始
  const handleStartReview = async () => {
    setLoading(true);
    try {
      // 今日復習すべき単語を取得
      const reviewWords = await loadWords();

      // 復習対象の単語がある場合、復習モードを開始
      if (reviewWords.length > 0) {
        setWordPairs(reviewWords);
        setAppState(AppState.REVIEW);
      } else {
        setError("今日復習すべき単語はありません");
      }
    } catch (err) {
      console.error("復習データ読み込みエラー:", err);
      setError("復習データの読み込み中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
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
            <>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 3,
                  mb: 4,
                }}
              >
                {/* 新しい単語セット作成カード */}
                <Card sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      新しい単語セットを作成
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      画像をアップロードして単語を抽出します
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setAppState(AppState.UPLOAD)}
                      disabled={appState === AppState.UPLOAD}
                    >
                      画像アップロード
                    </Button>
                  </CardActions>
                </Card>

                {/* 復習カード */}
                <Card sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      今日の復習
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      以前に学習した単語を復習します
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleStartReview}
                      disabled={loading}
                    >
                      {loading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        "復習を始める"
                      )}
                    </Button>
                  </CardActions>
                </Card>
              </Box>

              <ImageUploader
                onOcrComplete={handleOcrComplete}
                onError={handleError}
              />
            </>
          )}

          {appState === AppState.EDIT && (
            <WordEditForm
              initialWordPairs={wordPairs}
              onComplete={handleEditComplete}
              imageUrl={imageUrl}
            />
          )}

          {(appState === AppState.STUDY || appState === AppState.REVIEW) && (
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
