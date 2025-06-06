import { Box, Button, Typography, Paper } from "@mui/material";
import { useAuth } from "../../hooks/useAuth";

const Profile = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{ p: 4, width: "100%", maxWidth: 400, mx: "auto" }}
    >
      <Typography variant="h5" align="center" gutterBottom>
        プロフィール
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" gutterBottom>
          <strong>メールアドレス:</strong> {user?.email}
        </Typography>
      </Box>

      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Button variant="contained" color="primary" onClick={handleSignOut}>
          ログアウト
        </Button>
      </Box>
    </Paper>
  );
};

export default Profile;
