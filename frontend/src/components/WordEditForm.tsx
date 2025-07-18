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
  CircularProgress,
  Alert,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import type { WordPair } from "../types";
import { useUserWords } from "../hooks/useUserWords";
import { useAuth } from "../hooks/useAuth";

interface WordEditFormProps {
  initialWordPairs: WordPair[];
  onSaved: () => void; // 保存完了時のコールバック
  imageUrl: string | null;
}

const WordEditForm = ({
  initialWordPairs,
  onSaved,
  imageUrl,
}: WordEditFormProps) => {
  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newPronunciation, setNewPronunciation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ユーザー単語管理フック
  const { saveWords, loading, error } = useUserWords();
  const { user } = useAuth();

  // 初期データが変更されたときにstateを更新
  useEffect(() => {
    if (initialWordPairs.length > 0) {
      setWordPairs(initialWordPairs);
    }
  }, [initialWordPairs]);

  // エラー処理
  useEffect(() => {
    if (error) {
      setSaveError(error);
    }
  }, [error]);

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

  const handlePronunciationChange = (index: number, value: string) => {
    const updated = [...wordPairs];
    updated[index] = { ...updated[index], pronunciation: value };
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

    setWordPairs([
      ...wordPairs,
      {
        word: newWord,
        meaning: newMeaning,
        pronunciation: newPronunciation.trim() || undefined,
      },
    ]);
    setNewWord("");
    setNewMeaning("");
    setNewPronunciation("");
  };

  const handleSave = async () => {
    if (wordPairs.length === 0) {
      alert(
        "単語が登録されていません。少なくとも1つの単語を追加してください。"
      );
      return;
    }

    if (!user) {
      alert("ログインが必要です。");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // 単語帳のタイトルを作成
      const wordbookTitle = `単語帳 ${new Date().toLocaleDateString()} (${
        wordPairs.length
      }語)`;

      // 単語データを単語帳として保存
      console.log("単語帳保存開始:", wordPairs);
      const wordbookId = await saveWords(wordPairs, wordbookTitle);
      console.log("単語帳保存完了 - ID:", wordbookId);

      alert(`単語帳「${wordbookTitle}」を保存しました！`);

      // 保存完了をコールバックで通知
      onSaved();
    } catch (err) {
      console.error("単語保存エラー:", err);
      setSaveError(
        err instanceof Error
          ? err.message
          : "単語の保存中にエラーが発生しました"
      );
    } finally {
      setSaving(false);
    }
  };

  // 重複除去と並べ替えを行う
  const normalizeDictionary = () => {
    // 単語のマップを作成
    const wordMap = new Map<string, WordPair>();

    // 同じ単語があれば上書き、ない場合は新規追加
    wordPairs.forEach((pair) => {
      const key = pair.word.toLowerCase().trim();
      if (key !== "") {
        wordMap.set(key, {
          word: pair.word.trim(),
          meaning: pair.meaning.trim(),
          pronunciation: pair.pronunciation?.trim() || undefined,
        });
      }
    });

    // MapをArrayに変換してアルファベット順に並べ替え
    const normalizedArray = Array.from(wordMap.values()).sort((a, b) =>
      a.word.localeCompare(b.word)
    );

    setWordPairs(normalizedArray);
  };

  return (
    <Box
      sx={{ width: "100%", mt: 3, display: "flex", flexDirection: "column" }}
    >
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {/* 最初に単語追加セクション */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          単語の追加
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
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
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              alignItems: "flex-end",
            }}
          >
            <TextField
              fullWidth
              label="発音記号（任意）"
              placeholder="例: /prəˌnʌnsiˈeɪʃən/"
              value={newPronunciation}
              onChange={(e) => setNewPronunciation(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
              helperText="IPA表記で入力してください"
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1">
            登録単語一覧 ({wordPairs.length}単語)
          </Typography>

          <Button
            variant="outlined"
            size="small"
            onClick={normalizeDictionary}
            disabled={wordPairs.length === 0}
          >
            重複除去・並び替え
          </Button>
        </Box>

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
                      flexDirection: "column",
                      width: "100%",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                      }}
                    >
                      <TextField
                        fullWidth
                        label="単語"
                        value={pair.word}
                        onChange={(e) =>
                          handleWordChange(index, e.target.value)
                        }
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

                    <TextField
                      fullWidth
                      label="発音記号（任意）"
                      placeholder="例: /prəˌnʌnsiˈeɪʃən/"
                      value={pair.pronunciation || ""}
                      onChange={(e) =>
                        handlePronunciationChange(index, e.target.value)
                      }
                      size="small"
                      sx={{ mr: 5 }} // 削除ボタンの幅分右マージンを追加
                    />
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
            onClick={handleSave}
            disabled={wordPairs.length === 0 || saving || loading}
            size="large"
            sx={{ minWidth: 120 }}
          >
            {saving || loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "単語帳として保存"
            )}
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
