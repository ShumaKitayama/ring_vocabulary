import axios from "axios";
import type { OcrResponse } from "../types";

// 開発環境と本番環境でのAPI URLを切り替える
const API_URL = import.meta.env.DEV ? "http://localhost:3001/api" : "/api";

// 画像をアップロードしてOCR処理を行うAPI
export const uploadImageForOcr = async (file: File): Promise<OcrResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await axios.post<OcrResponse>(`${API_URL}/ocr`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
};
