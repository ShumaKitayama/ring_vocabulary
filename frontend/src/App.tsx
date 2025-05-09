import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme, Box } from "@mui/material";
import Home from "./pages/Home";

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
      </Box>
    </ThemeProvider>
  );
}

export default App;
