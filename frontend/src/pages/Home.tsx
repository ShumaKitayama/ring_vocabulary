import { useState } from "react";
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
  Tabs,
  Tab,
} from "@mui/material";
import ImageUploader from "../components/ImageUploader";
import WordEditForm from "../components/WordEditForm";
import WordbookList from "../components/WordbookList";
import Flashcard from "../components/Flashcard";
import { useUserWords } from "../hooks/useUserWords";
import type { OcrResponse, WordPair, ExtendedWordPair } from "../types";

enum AppState {
  HOME, // ホーム画面（タブ選択）
  EDIT, // 単語編集画面
  STUDY, // 学習画面
  REVIEW, // 復習画面
}

enum HomeTab {
  CREATE, // 新規作成タブ
  LEARN, // 学習タブ
}

const Home = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [homeTab, setHomeTab] = useState<HomeTab>(HomeTab.CREATE);
  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 単語データフック
  const { loadWords } = useUserWords();

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

  // 単語帳保存完了時の処理
  const handleSaveComplete = () => {
    setAppState(AppState.HOME);
    setHomeTab(HomeTab.LEARN); // 学習タブに切り替え
    setWordPairs([]);
    setImageUrl(null);
  };

  // 単語帳選択時の処理
  const handleSelectWordbook = async (wordbookId: string) => {
    setLoading(true);
    try {
      const selectedWords = await loadWords(wordbookId);

      if (selectedWords.length > 0) {
        // ExtendedWordPairからWordPairに変換
        const wordPairsForStudy: WordPair[] = selectedWords.map(
          (word: ExtendedWordPair) => ({
            word: word.word,
            meaning: word.meaning,
            id: word.id,
            mastered: word.mastered,
            reviewDate: word.reviewDate,
            user_word_id: word.user_word_id, // 重要：user_word_idを保持
          })
        );

        setWordPairs(wordPairsForStudy);
        setAppState(AppState.STUDY);
      } else {
        setError("単語帳にデータが見つかりません");
      }
    } catch (err) {
      console.error("単語帳読み込みエラー:", err);
      setError("単語帳の読み込み中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 復習モード開始
  const handleStartReview = async () => {
    setLoading(true);
    try {
      // 今日復習すべき単語を取得（特定の単語帳は指定しない）
      const reviewWords = await loadWords();

      if (reviewWords.length > 0) {
        // ExtendedWordPairからWordPairに変換
        const wordPairsForReview: WordPair[] = reviewWords.map(
          (word: ExtendedWordPair) => ({
            word: word.word,
            meaning: word.meaning,
            id: word.id,
            mastered: word.mastered,
            reviewDate: word.reviewDate,
            user_word_id: word.user_word_id, // 重要：user_word_idを保持
          })
        );

        setWordPairs(wordPairsForReview);
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

  // 学習・復習終了時の処理
  const handleStudyExit = () => {
    setAppState(AppState.HOME);
    setWordPairs([]);
    setImageUrl(null);
  };

  // ホームに戻る
  const handleBackToHome = () => {
    setAppState(AppState.HOME);
    setWordPairs([]);
    setImageUrl(null);
  };

  // スナックバーを閉じる
  const handleCloseError = () => {
    setError(null);
  };

  // タブ変更
  const handleTabChange = (_event: React.SyntheticEvent, newValue: HomeTab) => {
    setHomeTab(newValue);
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

          {appState === AppState.HOME && (
            <Box>
              <Tabs
                value={homeTab}
                onChange={handleTabChange}
                centered
                sx={{ mb: 4 }}
              >
                <Tab label="新規作成" value={HomeTab.CREATE} />
                <Tab label="学習・復習" value={HomeTab.LEARN} />
              </Tabs>

              {homeTab === HomeTab.CREATE && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    画像から新しい単語帳を作成
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    画像をアップロードして単語を抽出し、単語帳として保存します
                  </Typography>
                  <ImageUploader
                    onOcrComplete={handleOcrComplete}
                    onError={handleError}
                  />
                </Box>
              )}

              {homeTab === HomeTab.LEARN && (
                <Box>
                  {/* 復習カード */}
                  <Card sx={{ mb: 3 }}>
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

                  {/* 単語帳一覧 */}
                  <WordbookList onSelectWordbook={handleSelectWordbook} />
                </Box>
              )}
            </Box>
          )}

          {appState === AppState.EDIT && (
            <Box>
              <Button
                variant="outlined"
                onClick={handleBackToHome}
                sx={{ mb: 2 }}
              >
                ← ホームに戻る
              </Button>
              <WordEditForm
                initialWordPairs={wordPairs}
                onSaved={handleSaveComplete}
                imageUrl={imageUrl}
              />
            </Box>
          )}

          {(appState === AppState.STUDY || appState === AppState.REVIEW) && (
            <Box>
              <Button
                variant="outlined"
                onClick={handleStudyExit}
                sx={{ mb: 2 }}
              >
                ← ホームに戻る
              </Button>
              <Flashcard wordPairs={wordPairs} onExit={handleStudyExit} />
            </Box>
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
