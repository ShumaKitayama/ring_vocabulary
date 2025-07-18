import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
  Home as HomeIcon,
} from "@mui/icons-material";
import { useFillInStudy } from "../hooks/useFillInStudy";
import type { FillInSet } from "../types";

interface FillInStudyProps {
  selectedSet: FillInSet;
  onBack: () => void;
}

const FillInStudy: React.FC<FillInStudyProps> = ({ selectedSet, onBack }) => {
  const {
    session,
    loading,
    error,
    startStudySession,
    submitAnswer,
    nextProblem,
    previousProblem,
    getCurrentProblem,
    getSessionStats,
    getUserAnswer,
    getProblemResult,
    endSession,
  } = useFillInStudy();

  const [userInput, setUserInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // 学習セッション開始
  useEffect(() => {
    startStudySession(selectedSet.id);
  }, [selectedSet.id, startStudySession]);

  // 現在の問題と統計を取得
  const currentProblem = getCurrentProblem();
  const stats = getSessionStats();

  // 問題が変わった時の処理
  useEffect(() => {
    if (currentProblem) {
      // 既に答えているかチェック
      const existingAnswer = getUserAnswer(currentProblem.id);

      if (existingAnswer !== undefined) {
        setUserInput(existingAnswer);
        setIsAnswered(true);
        setShowResult(true);
      } else {
        setUserInput("");
        setIsAnswered(false);
        setShowResult(false);
        // 入力フィールドにフォーカス
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [currentProblem, getUserAnswer, getProblemResult]);

  // セッション完了時の処理
  useEffect(() => {
    if (stats?.isCompleted) {
      setCompletionDialogOpen(true);
    }
  }, [stats?.isCompleted]);

  // 回答提出
  const handleSubmitAnswer = async () => {
    if (!currentProblem || !userInput.trim()) return;

    await submitAnswer(userInput.trim());
    setIsAnswered(true);
    setShowResult(true);
  };

  // 次の問題へ
  const handleNext = () => {
    const hasNext = nextProblem();
    if (!hasNext && stats?.isCompleted) {
      setCompletionDialogOpen(true);
    }
  };

  // 前の問題へ
  const handlePrevious = () => {
    previousProblem();
  };

  // Enter キーでの回答提出
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !isAnswered && userInput.trim()) {
      handleSubmitAnswer();
    }
  };

  // 学習完了処理
  const handleStudyComplete = () => {
    setCompletionDialogOpen(false);
    endSession();
    onBack();
  };

  // 再学習
  const handleRestart = () => {
    setCompletionDialogOpen(false);
    endSession();
    startStudySession(selectedSet.id);
  };

  // 穴埋め文章を表示する関数
  const renderProblemText = () => {
    if (!currentProblem || !session) return null;

    const texts = session.problems[0]?.text
      ? // 同じセットの他の問題からテキスト順序を取得
        session.problems
          .map((p) => p.text!)
          .sort((a, b) => a.position - b.position)
          .filter(
            (text, index, array) =>
              index === 0 || text.id !== array[index - 1].id
          )
      : [];

    if (texts.length === 0) return null;

    return (
      <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: "grey.50" }}>
        <Typography
          variant="body1"
          sx={{ lineHeight: 2.5, fontSize: "1.1rem" }}
        >
          {texts.map((text) => (
            <React.Fragment key={text.id}>
              {text.is_punctuation ? (
                <span style={{ marginRight: 0 }}>{text.text_content}</span>
              ) : text.id === currentProblem.text_id ? (
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    minWidth: "120px",
                    height: "32px",
                    border: "2px dashed",
                    borderColor: "primary.main",
                    backgroundColor: "primary.50",
                    borderRadius: 1,
                    margin: "0 2px",
                    position: "relative",
                    verticalAlign: "middle",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color: "primary.main",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                    }}
                  >
                    ___
                  </Typography>
                </Box>
              ) : (
                <span style={{ marginRight: text.is_punctuation ? 0 : 4 }}>
                  {text.text_content}
                </span>
              )}
            </React.Fragment>
          ))}
        </Typography>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <Typography variant="h6" gutterBottom>
          学習データを読み込み中...
        </Typography>
        <LinearProgress sx={{ width: "100%", maxWidth: 400 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={onBack} startIcon={<ArrowBackIcon />}>
          戻る
        </Button>
      </Box>
    );
  }

  if (!session || !currentProblem) {
    return (
      <Box p={4}>
        <Alert severity="info" sx={{ mb: 2 }}>
          学習する問題がありません
        </Alert>
        <Button onClick={onBack} startIcon={<ArrowBackIcon />}>
          戻る
        </Button>
      </Box>
    );
  }

  const currentResult = getProblemResult(currentProblem.id);

  return (
    <Box>
      {/* ヘッダー */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mr: 2 }}>
            戻る
          </Button>
          <Typography variant="h5">{selectedSet.title} - 学習</Typography>
        </Box>

        {stats && (
          <Box display="flex" gap={1}>
            <Chip
              label={`${stats.correctCount}/${stats.totalProblems} 正解`}
              color="success"
              variant="outlined"
            />
            <Chip
              label={`精度: ${stats.accuracy.toFixed(0)}%`}
              color={
                stats.accuracy >= 80
                  ? "success"
                  : stats.accuracy >= 60
                  ? "warning"
                  : "error"
              }
              variant="outlined"
            />
          </Box>
        )}
      </Box>

      {/* 進捗バー */}
      {stats && (
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">
              問題 {session.currentIndex + 1} / {stats.totalProblems}
            </Typography>
            <Typography variant="body2">
              {stats.answeredCount} / {stats.totalProblems} 完了
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(stats.answeredCount / stats.totalProblems) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}

      {/* 問題表示 */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            空欄に入る単語を入力してください
          </Typography>

          {renderProblemText()}

          {/* 回答入力 */}
          <Box mb={3}>
            <TextField
              ref={inputRef}
              fullWidth
              label="答えを入力"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isAnswered}
              variant="outlined"
              sx={{ mb: 2 }}
              autoComplete="off"
            />

            {!isAnswered && (
              <Button
                variant="contained"
                onClick={handleSubmitAnswer}
                disabled={!userInput.trim()}
                size="large"
              >
                回答する
              </Button>
            )}
          </Box>

          {/* 結果表示 */}
          {showResult && isAnswered && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {currentResult ? (
                  <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
                ) : (
                  <CancelIcon color="error" sx={{ fontSize: 32 }} />
                )}
                <Typography
                  variant="h6"
                  color={currentResult ? "success.main" : "error.main"}
                >
                  {currentResult ? "正解！" : "不正解"}
                </Typography>
              </Box>

              {!currentResult && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  正解: {currentProblem.correct_answer}
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ナビゲーション */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handlePrevious}
          disabled={session.currentIndex === 0}
          variant="outlined"
        >
          前の問題
        </Button>

        <Typography variant="body2" color="textSecondary">
          {session.currentIndex + 1} / {session.problems.length}
        </Typography>

        <Button
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
          disabled={!isAnswered}
          variant={
            session.currentIndex === session.problems.length - 1
              ? "contained"
              : "outlined"
          }
          color={
            session.currentIndex === session.problems.length - 1
              ? "success"
              : "primary"
          }
        >
          {session.currentIndex === session.problems.length - 1
            ? "完了"
            : "次の問題"}
        </Button>
      </Box>

      {/* 完了ダイアログ */}
      <Dialog
        open={completionDialogOpen}
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            学習完了
          </Box>
        </DialogTitle>
        <DialogContent>
          {stats && (
            <Box>
              <Typography variant="h6" gutterBottom>
                結果
              </Typography>
              <Box display="flex" gap={2} mb={2}>
                <Chip label={`正解: ${stats.correctCount}問`} color="success" />
                <Chip
                  label={`不正解: ${stats.incorrectCount}問`}
                  color="error"
                />
                <Chip
                  label={`精度: ${stats.accuracy.toFixed(0)}%`}
                  color="primary"
                />
              </Box>
              <Typography variant="body1">
                {stats.accuracy >= 80
                  ? "素晴らしい結果です！よく覚えています。"
                  : stats.accuracy >= 60
                  ? "よくできました！もう少し練習してみましょう。"
                  : "練習を重ねて覚えていきましょう。"}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStudyComplete} startIcon={<HomeIcon />}>
            終了
          </Button>
          <Button
            onClick={handleRestart}
            startIcon={<ReplayIcon />}
            variant="contained"
          >
            もう一度
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FillInStudy;
