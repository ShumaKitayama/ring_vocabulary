import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  List,
  ListItem,
  Paper,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import type { WordPair } from "../types";

interface WordEditFormProps {
  initialWordPairs: WordPair[];
  onComplete: (wordPairs: WordPair[]) => void;
  imageUrl: string | null;
}

const WordEditForm = ({
  initialWordPairs,
  onComplete,
  imageUrl,
}: WordEditFormProps) => {
  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");

  // 初期データが変更されたときにstateを更新
  useEffect(() => {
    if (initialWordPairs.length > 0) {
      setWordPairs(initialWordPairs);
    }
  }, [initialWordPairs]);

  const handleWordChange = (index: number, value: string) => {
    const updated = [...wordPairs];
    updated[index] = { ...updated[index], word: value };
    setWordPairs(updated);
  };

  const handleMeaningChange = (index: number, value: string) => {
    const updated = [...wordPairs];
    updated[index] = { ...updated[index], meaning: value };
    setWordPairs(updated);
  };

  const handleDelete = (index: number) => {
    const updated = wordPairs.filter((_, i) => i !== index);
    setWordPairs(updated);
  };

  const handleAddNewPair = () => {
    if (newWord.trim() === "" || newMeaning.trim() === "") {
      return;
    }

    setWordPairs([...wordPairs, { word: newWord, meaning: newMeaning }]);
    setNewWord("");
    setNewMeaning("");
  };

  const handleStart = () => {
    if (wordPairs.length === 0) {
      alert(
        "単語が登録されていません。少なくとも1つの単語を追加してください。"
      );
      return;
    }

    onComplete(wordPairs);
  };

  return (
    <Box
      sx={{ width: "100%", mt: 3, display: "flex", flexDirection: "column" }}
    >
      {/* 最初に単語追加セクション */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          単語の追加
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <TextField
            fullWidth
            label="単語"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
          />

          <TextField
            fullWidth
            label="意味"
            value={newMeaning}
            onChange={(e) => setNewMeaning(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
          />

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddNewPair}
            disabled={newWord.trim() === "" || newMeaning.trim() === ""}
            sx={{ minWidth: "100px" }}
          >
            追加
          </Button>
        </Box>
      </Paper>

      {/* 登録単語一覧 */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          登録単語一覧 ({wordPairs.length}単語)
        </Typography>

        {wordPairs.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, mb: 2 }}
          >
            単語が登録されていません。単語を追加するか、画像から単語を抽出してください。
          </Typography>
        ) : (
          <Box sx={{ maxHeight: "300px", overflow: "auto", my: 2 }}>
            <List sx={{ width: "100%" }}>
              {wordPairs.map((pair, index) => (
                <ListItem key={index} disablePadding sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      width: "100%",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <TextField
                      fullWidth
                      label="単語"
                      value={pair.word}
                      onChange={(e) => handleWordChange(index, e.target.value)}
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="意味"
                      value={pair.meaning}
                      onChange={(e) =>
                        handleMeaningChange(index, e.target.value)
                      }
                      size="small"
                    />

                    <IconButton
                      color="error"
                      onClick={() => handleDelete(index)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Box sx={{ mt: "auto", display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleStart}
            disabled={wordPairs.length === 0}
            size="large"
          >
            学習開始
          </Button>
        </Box>
      </Paper>

      {/* オプションの画像表示（必要な場合のみ） */}
      {imageUrl && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            抽出元画像
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <img
              src={imageUrl}
              alt="Uploaded"
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default WordEditForm;
