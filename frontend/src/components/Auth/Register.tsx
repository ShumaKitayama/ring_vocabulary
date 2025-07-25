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

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("有効なメールアドレスを入力してください");
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);

      if (error) {
        console.error("Registration error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        // エラーメッセージを日本語に変換
        let errorMessage = error.message;

        if (error.message.includes("User already registered")) {
          errorMessage = "このメールアドレスは既に登録されています";
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "無効なメールアドレスです";
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = "パスワードは6文字以上必要です";
        } else if (error.message.includes("Database error")) {
          errorMessage =
            "データベースエラーが発生しました。管理者にお問い合わせください";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "メールアドレスの確認が必要です";
        } else if (error.message.includes("Signup is disabled")) {
          errorMessage = "現在、新規登録は無効になっています";
        } else if (error.message.includes("Email rate limit exceeded")) {
          errorMessage =
            "メール送信の制限に達しました。しばらく待ってから再試行してください";
        } else if (error.message.includes("Unable to validate email address")) {
          errorMessage = "メールアドレスの検証に失敗しました";
        } else if (
          error.message.includes("new row violates row-level security")
        ) {
          errorMessage = "アカウント作成時のセキュリティエラーが発生しました";
        } else if (error.message.includes("permission denied")) {
          errorMessage = "アクセス権限が不足しています";
        } else if (error.message.includes("unique constraint")) {
          errorMessage = "既に使用されているメールアドレスです";
        } else if (
          error.message.includes("function") &&
          error.message.includes("does not exist")
        ) {
          errorMessage =
            "データベース設定に問題があります。管理者にお問い合わせください";
        }

        setError(errorMessage);
      } else {
        setSuccess("確認メールを送信しました。メールをご確認ください。");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error("Unexpected registration error:", err);
      console.error("Error details:", {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack : undefined,
      });

      setError(
        "予期しないエラーが発生しました。時間をおいて再試行してください。"
      );
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
