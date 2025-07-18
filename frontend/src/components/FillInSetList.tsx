import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { useFillInSets } from "../hooks/useFillInSets";
import type { FillInSet } from "../types";

interface FillInSetListProps {
  onSelectSet: (set: FillInSet) => void;
  onCreateSet: (set: FillInSet) => void;
  onStudySet: (set: FillInSet) => void;
}

const FillInSetList: React.FC<FillInSetListProps> = ({
  onSelectSet,
  onCreateSet,
  onStudySet,
}) => {
  const { sets, loading, error, createSet, updateSet, deleteSet } =
    useFillInSets();

  // ダイアログの状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<FillInSet | null>(null);

  // フォームの状態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // メニューの状態
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuSetId, setMenuSetId] = useState<string | null>(null);

  // 作成ダイアログを開く
  const handleCreateClick = () => {
    setTitle("");
    setDescription("");
    setCreateDialogOpen(true);
  };

  // 作成実行
  const handleCreateSubmit = async () => {
    if (!title.trim()) return;

    const newSet = await createSet(
      title.trim(),
      description.trim() || undefined
    );
    if (newSet) {
      setCreateDialogOpen(false);
      onCreateSet(newSet);
    }
  };

  // 編集ダイアログを開く
  const handleEditClick = (set: FillInSet) => {
    setSelectedSet(set);
    setTitle(set.title);
    setDescription(set.description || "");
    setEditDialogOpen(true);
    setAnchorEl(null);
  };

  // 編集実行
  const handleEditSubmit = async () => {
    if (!selectedSet || !title.trim()) return;

    const success = await updateSet(
      selectedSet.id,
      title.trim(),
      description.trim() || undefined
    );
    if (success) {
      setEditDialogOpen(false);
      setSelectedSet(null);
    }
  };

  // 削除ダイアログを開く
  const handleDeleteClick = (set: FillInSet) => {
    setSelectedSet(set);
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  // 削除実行
  const handleDeleteSubmit = async () => {
    if (!selectedSet) return;

    const success = await deleteSet(selectedSet.id);
    if (success) {
      setDeleteDialogOpen(false);
      setSelectedSet(null);
    }
  };

  // メニューを開く
  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    setId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuSetId(setId);
  };

  // メニューを閉じる
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuSetId(null);
  };

  // セットを選択
  const handleSetClick = (set: FillInSet) => {
    onSelectSet(set);
  };

  // 学習開始
  const handleStudyClick = (set: FillInSet) => {
    onStudySet(set);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" component="h2">
          穴埋め問題セット
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          新しいセットを作成
        </Button>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* セット一覧 */}
      {sets.length === 0 ? (
        <Box textAlign="center" py={6}>
          <AssignmentIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            穴埋め問題セットがありません
          </Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>
            画像から文章を読み取って、穴埋め問題セットを作成しましょう
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            最初のセットを作成
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 2,
          }}
        >
          {sets.map((set) => (
            <Card
              key={set.id}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={1}
                >
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ flexGrow: 1, mr: 1 }}
                  >
                    {set.title}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, set.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {set.description && (
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {set.description}
                  </Typography>
                )}

                <Box display="flex" gap={1} mb={2}>
                  <Chip
                    label={`${set.problemCount || 0}問`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  作成日: {new Date(set.created_at).toLocaleDateString("ja-JP")}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleSetClick(set)}
                >
                  編集
                </Button>
                <Button
                  size="small"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleStudyClick(set)}
                  disabled={!set.problemCount || set.problemCount === 0}
                >
                  学習
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => handleEditClick(sets.find((s) => s.id === menuSetId)!)}
        >
          <EditIcon sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleDeleteClick(sets.find((s) => s.id === menuSetId)!)
          }
        >
          <DeleteIcon sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 作成ダイアログ */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新しい穴埋め問題セットを作成</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="セット名"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="説明（任意）"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!title.trim()}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>穴埋め問題セットを編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="セット名"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="説明（任意）"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!title.trim()}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>穴埋め問題セットを削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{selectedSet?.title}」を削除してもよろしいですか？
            <br />
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleDeleteSubmit}
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

export default FillInSetList;
