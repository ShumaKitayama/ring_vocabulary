import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  Paper,
  Alert,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";

interface RegisterProps {
  onToggleForm: () => void;
}

const Register = ({ onToggleForm }: RegisterProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // パスワード確認チェック
    if (password !== confirmPassword) {
      setError("パスワードと確認用パスワードが一致しません");
      return;
    }

    // パスワードの強度チェック
    if (password.length < 6) {
      setError("パスワードは6文字以上必要です");
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("確認メールを送信しました。メールをご確認ください。");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError("登録処理中にエラーが発生しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{ p: 4, width: "100%", maxWidth: 400, mx: "auto" }}
    >
      <Typography variant="h5" align="center" gutterBottom>
        アカウント登録
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="メールアドレス"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="パスワード（6文字以上）"
          type="password"
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="パスワード（確認用）"
          type="password"
          id="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? "登録中..." : "アカウント登録"}
        </Button>
        <Box textAlign="center">
          <Link
            component="button"
            variant="body2"
            onClick={onToggleForm}
            sx={{ cursor: "pointer" }}
          >
            既にアカウントをお持ちの方はこちら
          </Link>
        </Box>
      </Box>
    </Paper>
  );
};

export default Register;
