import { useState } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import type { WordPair } from "../types";

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

  // 現在の単語ペア
  const currentPair = shuffledPairs[currentIndex];

  // 進捗状況
  const progress = `${currentIndex + 1} / ${shuffledPairs.length}`;

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
    </Box>
  );
};

export default Flashcard;
