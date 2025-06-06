import axios from "axios";
import { supabase } from "./supabase";
import type { OcrResponse } from "../types";

// APIのベースURL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// 画像をアップロードしてOCR処理を行う
export const uploadImageForOcr = async (file: File): Promise<OcrResponse> => {
  try {
    // Supabase Edge Functionを使用する場合
    if (import.meta.env.VITE_USE_SUPABASE_FUNCTIONS === "true") {
      // ファイルをBase64エンコード
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // data:image/jpeg;base64, の部分を削除
          const base64String = result.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Supabase Edge FunctionでOCR処理
      const { data, error } = await supabase.functions.invoke<OcrResponse>(
        "ocr",
        {
          body: {
            image: base64,
            type: file.type,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("OCR処理に失敗しました");
      }

      return data;
    }
    // 従来のAPIエンドポイントを使用する場合
    else {
      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.post<OcrResponse>(
        `${API_BASE_URL}/api/ocr`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    }
  } catch (error) {
    console.error("OCR処理エラー:", error);
    throw error;
  }
};
