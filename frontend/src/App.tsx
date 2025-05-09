import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import Home from "./pages/Home";
import { useEffect, useState } from "react";
import { checkApiHealth } from "./utils/api";

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

function App() {
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">(
    "checking"
  );
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkApiHealth();
        if (health.status === "ok") {
          setApiStatus("ok");
        } else {
          setApiStatus("error");
          setApiError("APIサーバーのステータスが異常です");
        }
      } catch (error) {
        console.error("API健康チェックエラー:", error);
        setApiStatus("error");
        setApiError("APIサーバーに接続できません");
      }
    };

    checkHealth();
  }, []);

  const handleCloseError = () => {
    setApiError(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* CSSのリセット */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: "100%",
          maxWidth: "100vw",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          margin: 0,
          py: 4,
          bgcolor: "#f5f5f5",
        }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* 将来的に必要であれば他のルートを追加できます */}
          </Routes>
        </Router>

        <Snackbar
          open={apiStatus === "error" && apiError !== null}
          autoHideDuration={6000}
          onClose={handleCloseError}
        >
          <Alert onClose={handleCloseError} severity="error">
            {apiError}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
