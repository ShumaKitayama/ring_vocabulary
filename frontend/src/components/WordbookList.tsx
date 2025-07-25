import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import BookIcon from "@mui/icons-material/Book";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NumbersIcon from "@mui/icons-material/Numbers";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import ScheduleIcon from "@mui/icons-material/Schedule";
import RecommendIcon from "@mui/icons-material/Recommend";
import { useUserWords } from "../hooks/useUserWords";
import type { Wordbook } from "../types";
import { dateUtils } from "../utils/dateUtils";

interface WordbookListProps {
  onSelectWordbook: (wordbookId: string) => void;
}

// 再学習おすすめ度を計算する関数
const calculateRecommendationLevel = (
  lastStudyDate: string | null,
  masteredWordsCount: number,
  totalWordsCount: number
): {
  level: "high" | "medium" | "low" | "none";
  text: string;
  color: string;
} => {
  if (!lastStudyDate) {
    return {
      level: "high",
      text: "未学習",
      color: "error",
    };
  }

  const daysSinceLastStudy = dateUtils.getDaysFromNow(lastStudyDate);
  const masteryRate =
    totalWordsCount > 0 ? masteredWordsCount / totalWordsCount : 0;

  if (daysSinceLastStudy >= 7) {
    return {
      level: "high",
      text: "要復習",
      color: "error",
    };
  } else if (daysSinceLastStudy >= 3 || masteryRate < 0.5) {
    return {
      level: "medium",
      text: "復習推奨",
      color: "warning",
    };
  } else if (masteryRate < 0.8) {
    return {
      level: "low",
      text: "継続学習",
      color: "info",
    };
  } else {
    return {
      level: "none",
      text: "習得済み",
      color: "success",
    };
  }
};

const WordbookList: React.FC<WordbookListProps> = ({ onSelectWordbook }) => {
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [wordbookStats, setWordbookStats] = useState<{
    [key: string]: {
      lastStudyDate: string | null;
      masteredCount: number;
      totalCount: number;
    };
  }>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWordbookId, setSelectedWordbookId] = useState<string | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wordbookToDelete, setWordbookToDelete] = useState<Wordbook | null>(
    null
  );

  const { loadWordbooks, deleteWordbook, loadWords, loading, error } =
    useUserWords();

  // 単語帳一覧を読み込み
  useEffect(() => {
    const fetchWordbooks = async () => {
      try {
        const wordbooksData = await loadWordbooks();
        setWordbooks(wordbooksData);

        // 各単語帳の学習統計を取得
        const stats: {
          [key: string]: {
            lastStudyDate: string | null;
            masteredCount: number;
            totalCount: number;
          };
        } = {};
        for (const wordbook of wordbooksData) {
          try {
            const words = await loadWords(wordbook.id);

            const masteredWords = words.filter((w) => w.mastered);
            const lastStudyDates = words
              .map((w) => w.lastStudiedAt)
              .filter(
                (date): date is string => date !== null && date !== undefined
              )
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

            stats[wordbook.id] = {
              lastStudyDate:
                lastStudyDates.length > 0 ? lastStudyDates[0] : null,
              masteredCount: masteredWords.length,
              totalCount: words.length,
            };
          } catch (err) {
            console.error(`単語帳 ${wordbook.id} の統計取得エラー:`, err);
            stats[wordbook.id] = {
              lastStudyDate: null,
              masteredCount: 0,
              totalCount: wordbook.wordCount || 0,
            };
          }
        }
        setWordbookStats(stats);
      } catch (err) {
        console.error("単語帳一覧の読み込みエラー:", err);
      }
    };

    fetchWordbooks();
  }, [loadWordbooks, loadWords]);

  // メニューを開く
  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    wordbookId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedWordbookId(wordbookId);
  };

  // メニューを閉じる
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWordbookId(null);
  };

  // 削除ダイアログを開く
  const handleDeleteClick = () => {
    const wordbook = wordbooks.find((w) => w.id === selectedWordbookId);
    if (wordbook) {
      setWordbookToDelete(wordbook);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  // 削除ダイアログを閉じる
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setWordbookToDelete(null);
  };

  // 削除実行
  const handleDeleteConfirm = async () => {
    if (!wordbookToDelete) return;

    try {
      await deleteWordbook(wordbookToDelete.id);
      setWordbooks((prev) => prev.filter((w) => w.id !== wordbookToDelete.id));
      setWordbookStats((prev) => {
        const newStats = { ...prev };
        delete newStats[wordbookToDelete.id];
        return newStats;
      });
      alert(`単語帳「${wordbookToDelete.title}」を削除しました。`);
    } catch (err) {
      console.error("単語帳削除エラー:", err);
      alert("単語帳の削除に失敗しました。");
    } finally {
      handleDeleteDialogClose();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (wordbooks.length === 0) {
    return (
      <Box sx={{ textAlign: "center", p: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          保存された単語帳がありません
        </Typography>
        <Typography variant="body2" color="text.secondary">
          画像から単語を抽出して単語帳を作成してください。
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        <BookIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        保存された単語帳
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 3,
        }}
      >
        {wordbooks.map((wordbook) => {
          const stats = wordbookStats[wordbook.id];
          const recommendation = stats
            ? calculateRecommendationLevel(
                stats.lastStudyDate,
                stats.masteredCount,
                stats.totalCount
              )
            : { level: "none", text: "読み込み中", color: "default" };

          return (
            <Card
              key={wordbook.id}
              elevation={3}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                  }}
                >
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {wordbook.title}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, wordbook.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {wordbook.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {wordbook.description}
                  </Typography>
                )}

                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Chip
                    icon={<NumbersIcon />}
                    label={`${wordbook.wordCount || 0}語`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<CalendarTodayIcon />}
                    label={new Date(wordbook.created_at).toLocaleDateString()}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                {/* 学習情報 */}
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {stats && stats.lastStudyDate && (
                    <Chip
                      icon={<ScheduleIcon />}
                      label={`前回学習: ${dateUtils.formatRelativeDate(
                        stats.lastStudyDate
                      )}`}
                      size="small"
                      variant="filled"
                      color="info"
                    />
                  )}

                  <Chip
                    icon={<RecommendIcon />}
                    label={recommendation.text}
                    size="small"
                    variant="filled"
                    color={
                      recommendation.color as
                        | "default"
                        | "primary"
                        | "secondary"
                        | "error"
                        | "info"
                        | "success"
                        | "warning"
                    }
                  />

                  {stats && stats.totalCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      習得率:{" "}
                      {Math.round(
                        (stats.masteredCount / stats.totalCount) * 100
                      )}
                      % ({stats.masteredCount}/{stats.totalCount})
                    </Typography>
                  )}
                </Box>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => onSelectWordbook(wordbook.id.toString())}
                  fullWidth
                >
                  学習開始
                </Button>
              </CardActions>
            </Card>
          );
        })}
      </Box>

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>単語帳を削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            単語帳「{wordbookToDelete?.title}」を削除しますか？
            <br />
            この操作は取り消すことができません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>キャンセル</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WordbookList;
