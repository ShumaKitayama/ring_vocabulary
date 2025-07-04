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
} from "@mui/material";
import BookIcon from "@mui/icons-material/Book";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NumbersIcon from "@mui/icons-material/Numbers";
import { useUserWords } from "../hooks/useUserWords";
import type { Wordbook } from "../types";

interface WordbookListProps {
  onSelectWordbook: (wordbookId: string) => void;
}

const WordbookList: React.FC<WordbookListProps> = ({ onSelectWordbook }) => {
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const { loadWordbooks, loading, error } = useUserWords();

  // 単語帳一覧を読み込み
  useEffect(() => {
    const fetchWordbooks = async () => {
      try {
        const wordbooksData = await loadWordbooks();
        setWordbooks(wordbooksData);
      } catch (err) {
        console.error("単語帳一覧の読み込みエラー:", err);
      }
    };

    fetchWordbooks();
  }, [loadWordbooks]);

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
        {wordbooks.map((wordbook) => (
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
              <Typography variant="h6" component="div" gutterBottom>
                {wordbook.title}
              </Typography>

              {wordbook.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {wordbook.description}
                </Typography>
              )}

              <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
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
        ))}
      </Box>
    </Box>
  );
};

export default WordbookList;
