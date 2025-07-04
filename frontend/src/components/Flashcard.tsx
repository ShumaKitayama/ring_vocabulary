import { useState, useEffect } from "react";
import { Box, Typography, Button, Paper, Chip } from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import type { WordPair } from "../types";
import { useUserWords } from "../hooks/useUserWords";
import { addDays } from "../utils/dateUtils";

interface FlashcardProps {
  wordPairs: WordPair[];
  onExit: () => void;
}

const Flashcard = ({ wordPairs, onExit }: FlashcardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [shuffledPairs, setShuffledPairs] = useState<WordPair[]>([
    ...wordPairs,
  ]);
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());

  // 単語状態管理フック
  const { updateWordStatus, error } = useUserWords();

  // エラー処理
  useEffect(() => {
    if (error) {
      console.error("単語ステータス更新エラー:", error);
    }
  }, [error]);

  // シャッフル関数
  const shuffleCards = () => {
    const shuffled = [...wordPairs].sort(() => Math.random() - 0.5);
    setShuffledPairs(shuffled);
    setCurrentIndex(0);
    setShowMeaning(false);
    setShuffled(true);
  };

  // 順番に戻す関数
  const resetOrder = () => {
    setShuffledPairs([...wordPairs]);
    setCurrentIndex(0);
    setShowMeaning(false);
    setShuffled(false);
  };

  // 次の単語へ
  const handleNext = () => {
    if (currentIndex < shuffledPairs.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowMeaning(false);
    }
  };

  // 前の単語へ
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowMeaning(false);
    }
  };

  // 単語と意味を表示/非表示
  const toggleMeaning = () => {
    setShowMeaning(!showMeaning);
  };

  // 単語を「覚えた」としてマーク
  const markAsMastered = async () => {
    const currentPair = shuffledPairs[currentIndex];
    const userWordId = currentPair.user_word_id;

    if (!userWordId) {
      console.error("user_word_idが見つかりません:", currentPair);
      return;
    }

    // 単語IDを覚えた単語リストに追加
    const newMasteredWords = new Set(masteredWords);
    newMasteredWords.add(userWordId);
    setMasteredWords(newMasteredWords);

    // 次の復習日を計算（現在は1日後）
    const reviewDate = addDays(new Date(), 1);

    try {
      // Supabaseで単語の状態を更新（user_word_idを使用）
      await updateWordStatus(
        parseInt(userWordId),
        true,
        reviewDate.toISOString().split("T")[0]
      );
    } catch (error) {
      console.error("単語ステータスの更新エラー:", error);
    }

    // 自動で次の単語へ（最後でなければ）
    if (currentIndex < shuffledPairs.length - 1) {
      handleNext();
    }
  };

  // 現在の単語ペア
  const currentPair = shuffledPairs[currentIndex];

  // 防御的チェック：データが正しく渡されているか確認
  if (!shuffledPairs || shuffledPairs.length === 0) {
    return (
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="h6" color="error">
          学習する単語がありません
        </Typography>
        <Button variant="outlined" onClick={onExit} sx={{ mt: 2 }}>
          戻る
        </Button>
      </Box>
    );
  }

  if (!currentPair) {
    return (
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="h6" color="error">
          単語データの読み込みエラー
        </Typography>
        <Button variant="outlined" onClick={onExit} sx={{ mt: 2 }}>
          戻る
        </Button>
      </Box>
    );
  }

  // 進捗状況
  const progress = `${currentIndex + 1} / ${shuffledPairs.length}`;

  // 「覚えた」状態を確認
  const isCurrentMastered = currentPair?.user_word_id
    ? masteredWords.has(currentPair.user_word_id)
    : false;

  return (
    <Box
      sx={{
        mt: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography variant="h5" gutterBottom>
        フラッシュカード学習
      </Typography>

      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 600,
          height: 300,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: 3,
          mb: 3,
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={toggleMeaning}
      >
        <Typography
          variant="body2"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "text.secondary",
          }}
        >
          {progress}
        </Typography>

        {isCurrentMastered && (
          <Chip
            label="覚えた単語"
            color="success"
            size="small"
            sx={{ position: "absolute", top: 10, left: 10 }}
          />
        )}

        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            mb: showMeaning ? 2 : 0,
            textAlign: "center",
          }}
        >
          {currentPair.word}
        </Typography>

        {showMeaning && (
          <Typography
            variant="h5"
            color="primary"
            sx={{
              mt: 2,
              textAlign: "center",
            }}
          >
            {currentPair.meaning}
          </Typography>
        )}

        {!showMeaning && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            タップして意味を表示
          </Typography>
        )}
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          前へ
        </Button>

        <Button
          variant="contained"
          color="success"
          startIcon={<CheckIcon />}
          onClick={markAsMastered}
          disabled={isCurrentMastered}
        >
          覚えた
        </Button>

        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
          disabled={currentIndex === shuffledPairs.length - 1}
        >
          次へ
        </Button>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={shuffled ? resetOrder : shuffleCards}
          color={shuffled ? "secondary" : "primary"}
        >
          {shuffled ? "順番に戻す" : "シャッフル"}
        </Button>

        <Button variant="outlined" color="error" onClick={onExit}>
          終了
        </Button>
      </Box>

      <Typography variant="body2" sx={{ mt: 3, color: "text.secondary" }}>
        覚えた単語は{masteredWords.size}個 / {wordPairs.length}個
      </Typography>
    </Box>
  );
};

export default Flashcard;
