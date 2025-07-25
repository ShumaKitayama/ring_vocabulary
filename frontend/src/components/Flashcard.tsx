import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  VolumeUp as VolumeUpIcon,
} from "@mui/icons-material";
import type { WordPair, ExtendedWordPair } from "../types";
import { useUserWords } from "../hooks/useUserWords";
import { addDays } from "../utils/dateUtils";
import {
  speakEnglishWord,
  isSpeechSynthesisSupported,
} from "../utils/speechSynthesis";

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionRecorded, setSessionRecorded] = useState(false);
  const [showMasteredWords, setShowMasteredWords] = useState(() => {
    // LocalStorageから設定を復元（デフォルトはtrue）
    const saved = localStorage.getItem("flashcard_showMasteredWords");
    return saved ? JSON.parse(saved) : true;
  }); // 覚えた単語を表示するかどうか

  // 単語状態管理フック
  const { updateWordStatus, recordStudySession, error } = useUserWords();

  // エラー処理
  useEffect(() => {
    if (error) {
      console.error("単語ステータス更新エラー:", error);
    }
  }, [error]);

  // 初期化時に覚えた単語の状態を復元
  useEffect(() => {
    if (wordPairs.length > 0) {
      const initialMasteredWords = new Set<string>();
      wordPairs.forEach((pair) => {
        if (pair.mastered && pair.user_word_id) {
          initialMasteredWords.add(pair.user_word_id);
        }
      });
      setMasteredWords(initialMasteredWords);
    }
  }, [wordPairs]);

  // 表示モード設定の永続化
  useEffect(() => {
    localStorage.setItem(
      "flashcard_showMasteredWords",
      JSON.stringify(showMasteredWords)
    );
  }, [showMasteredWords]);

  // 学習セッション開始を記録
  useEffect(() => {
    const recordSession = async () => {
      if (!sessionRecorded && wordPairs.length > 0) {
        const firstWordPair = wordPairs[0] as ExtendedWordPair;
        if (firstWordPair?.wordbook_id) {
          try {
            await recordStudySession(firstWordPair.wordbook_id);
            setSessionRecorded(true);
          } catch (err) {
            console.error("学習セッション記録エラー:", err);
          }
        }
      }
    };

    recordSession();
  }, [wordPairs, sessionRecorded, recordStudySession]);

  // 初期化時とフィルタリング状態変更時に表示更新
  useEffect(() => {
    if (wordPairs.length > 0) {
      const filteredPairs = getFilteredPairs();
      setShuffledPairs([...filteredPairs]);
      setCurrentIndex(0);
      setShowMeaning(false);
    }
  }, [showMasteredWords, masteredWords, wordPairs]);

  // 覚えた単語のフィルタリング
  const getFilteredPairs = () => {
    if (showMasteredWords) {
      return wordPairs;
    } else {
      return wordPairs.filter((pair) => {
        const userWordId = pair.user_word_id;
        return !userWordId || !masteredWords.has(userWordId);
      });
    }
  };

  // シャッフル関数
  const shuffleCards = () => {
    const filteredPairs = getFilteredPairs();
    const shuffled = [...filteredPairs].sort(() => Math.random() - 0.5);
    setShuffledPairs(shuffled);
    setCurrentIndex(0);
    setShowMeaning(false);
    setShuffled(true);
  };

  // 順番に戻す関数
  const resetOrder = () => {
    const filteredPairs = getFilteredPairs();
    setShuffledPairs([...filteredPairs]);
    setCurrentIndex(0);
    setShowMeaning(false);
    setShuffled(false);
  };

  // 表示モード切り替え
  const toggleShowMasteredWords = () => {
    setShowMasteredWords(!showMasteredWords);
    // モード切り替え後、現在の表示を更新
    const filteredPairs = showMasteredWords
      ? wordPairs.filter((pair) => {
          const userWordId = pair.user_word_id;
          return !userWordId || !masteredWords.has(userWordId);
        })
      : wordPairs;

    if (shuffled) {
      const newShuffled = [...filteredPairs].sort(() => Math.random() - 0.5);
      setShuffledPairs(newShuffled);
    } else {
      setShuffledPairs([...filteredPairs]);
    }
    setCurrentIndex(0);
    setShowMeaning(false);
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

  // 単語を読み上げる
  const handleSpeak = async () => {
    if (!isSpeechSynthesisSupported()) {
      alert("お使いのブラウザは音声合成機能をサポートしていません");
      return;
    }

    const currentPair = shuffledPairs[currentIndex];
    if (!currentPair?.word) return;

    setIsSpeaking(true);
    try {
      await speakEnglishWord(currentPair.word);
    } catch (error) {
      console.error("音声読み上げエラー:", error);
    } finally {
      setIsSpeaking(false);
    }
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

    // 覚えた単語を隠すモードの場合、現在の単語が除外される可能性があるため
    // フィルタリング後の配列を確認して適切にナビゲーション
    if (!showMasteredWords) {
      // フィルタリングし直す
      const filteredPairs = wordPairs.filter((pair) => {
        const userWordId = pair.user_word_id;
        return !userWordId || !masteredWords.has(userWordId);
      });

      if (shuffled) {
        const newShuffled = [...filteredPairs].sort(() => Math.random() - 0.5);
        setShuffledPairs(newShuffled);
      } else {
        setShuffledPairs([...filteredPairs]);
      }

      // インデックスを調整
      if (currentIndex >= filteredPairs.length) {
        setCurrentIndex(Math.max(0, filteredPairs.length - 1));
      }
    } else {
      // 通常モードでは次の単語へ
      if (currentIndex < shuffledPairs.length - 1) {
        handleNext();
      }
    }
  };

  // 現在の単語ペア
  const currentPair = shuffledPairs[currentIndex];

  // 防御的チェック：データが正しく渡されているか確認
  if (!shuffledPairs || shuffledPairs.length === 0) {
    if (!showMasteredWords && wordPairs.length > 0) {
      // 覚えた単語を隠すモードで、すべて覚えた場合
      return (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="h5" color="success.main" gutterBottom>
            🎉 おめでとうございます！
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            すべての単語を覚えました！
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            覚えた単語も含めて復習したい場合は、「覚えた単語を表示」ボタンを押してください。
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              onClick={toggleShowMasteredWords}
            >
              覚えた単語を表示
            </Button>
            <Button variant="outlined" onClick={onExit}>
              戻る
            </Button>
          </Box>
        </Box>
      );
    } else {
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

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {currentPair.word}
          </Typography>

          {isSpeechSynthesisSupported() && (
            <IconButton
              onClick={handleSpeak}
              disabled={isSpeaking}
              size="small"
              sx={{ ml: 1 }}
            >
              <VolumeUpIcon color={isSpeaking ? "disabled" : "primary"} />
            </IconButton>
          )}
        </Box>

        {currentPair.pronunciation && (
          <Typography
            variant="body1"
            sx={{
              mt: 1,
              textAlign: "center",
              fontStyle: "italic",
              color: "text.secondary",
            }}
          >
            {currentPair.pronunciation}
          </Typography>
        )}

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

      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={shuffled ? resetOrder : shuffleCards}
          color={shuffled ? "secondary" : "primary"}
        >
          {shuffled ? "順番に戻す" : "シャッフル"}
        </Button>

        <Button
          variant="outlined"
          onClick={toggleShowMasteredWords}
          color={showMasteredWords ? "success" : "warning"}
        >
          {showMasteredWords ? "覚えた単語を隠す" : "覚えた単語を表示"}
        </Button>

        <Button variant="outlined" color="error" onClick={onExit}>
          終了
        </Button>
      </Box>

      <Box sx={{ textAlign: "center", mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          覚えた単語は{masteredWords.size}個 / {wordPairs.length}個
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {showMasteredWords ? "全ての単語を表示中" : "未習得の単語のみ表示中"}{" "}
          ({shuffledPairs.length}個)
        </Typography>
      </Box>
    </Box>
  );
};

export default Flashcard;
