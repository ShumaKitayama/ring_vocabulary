import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
} from "@mui/material";
import Home from "./pages/Home";
import { useAuth } from "./hooks/useAuth";
import { AuthProvider } from "./context/AuthContextProvider";
import AuthContainer from "./components/Auth/AuthContainer";
import Profile from "./components/Auth/Profile";

// アプリケーションのテーマを設定
const theme = createTheme({
  palette: {
    primary: {
      main: "#4caf50", // 緑色をプライマリカラーに
    },
    secondary: {
      main: "#2196f3", // 青色をセカンダリカラーに
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
  },
});

// プライベートルート用のラッパーコンポーネント
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 認証済みユーザー用のレイアウト
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ぼきゃぶらりんぐ
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user?.email}
            </Typography>
            <Button color="inherit" component="a" href="/profile">
              プロフィール
            </Button>
            <Button color="inherit" onClick={signOut}>
              ログアウト
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {children}
      </Container>
    </>
  );
};

function AppContent() {
  const { user, loading } = useAuth();

  return (
    <Router>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: "100%",
          maxWidth: "100vw",
          padding: 0,
          margin: 0,
          bgcolor: "#f5f5f5",
        }}
      >
        <Routes>
          <Route
            path="/login"
            element={
              !loading && user ? <Navigate to="/" replace /> : <AuthContainer />
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <AuthenticatedLayout>
                  <Profile />
                </AuthenticatedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AuthenticatedLayout>
                  <Home />
                </AuthenticatedLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Box>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* CSSのリセット */}
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
