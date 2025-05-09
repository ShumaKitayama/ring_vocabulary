import axios from "axios";
import type { OcrResponse } from "../types";

// 開発環境と本番環境でのAPI URLを切り替える
const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3001/api";

console.log(`Using API URL: ${API_URL} (${import.meta.env.MODE} mode)`);

// 画像をアップロードしてOCR処理を行うAPI
export const uploadImageForOcr = async (file: File): Promise<OcrResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await axios.post<OcrResponse>(`${API_URL}/ocr`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
};

// ヘルスチェックAPI
export const checkApiHealth = async (): Promise<{ status: string }> => {
  try {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  } catch (error) {
    console.error("Health check error:", error);
    throw error;
  }
};
