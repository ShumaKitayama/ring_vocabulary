import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// MUIの推奨に従って、strictモードを無効化（必要に応じて有効化可能）
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
