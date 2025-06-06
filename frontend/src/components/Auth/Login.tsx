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

interface LoginProps {
  onToggleForm: () => void;
}

const Login = ({ onToggleForm }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("ログイン処理中にエラーが発生しました");
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
        ログイン
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
          label="パスワード"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </Button>
        <Box textAlign="center">
          <Link
            component="button"
            variant="body2"
            onClick={onToggleForm}
            sx={{ cursor: "pointer" }}
          >
            アカウントをお持ちでない方はこちら
          </Link>
        </Box>
      </Box>
    </Paper>
  );
};

export default Login;
