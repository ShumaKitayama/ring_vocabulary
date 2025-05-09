import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import { Button, Box, Typography, CircularProgress } from "@mui/material";
import { uploadImageForOcr } from "../utils/api";
import type { OcrResponse } from "../types";

interface ImageUploaderProps {
  onOcrComplete: (result: OcrResponse) => void;
  onError: (error: unknown) => void;
}

const ImageUploader = ({ onOcrComplete, onError }: ImageUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // 画像ファイルか確認
    if (!file.type.startsWith("image/")) {
      onError(new Error("画像ファイルを選択してください。"));
      return;
    }

    // プレビュー用にURLを作成
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      onError(new Error("画像を選択してください。"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await uploadImageForOcr(fileInputRef.current.files[0]);
      // 画像URLを結果に追加
      if (selectedImage) {
        result.imageUrl = selectedImage;
      }
      onOcrComplete(result);
    } catch (error) {
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        mt: 3,
      }}
    >
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileSelect}
        ref={fileInputRef}
      />

      <Button
        variant="contained"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        sx={{ mb: 2, minWidth: "200px" }}
        size="large"
      >
        画像を選択
      </Button>

      {selectedImage && (
        <Box
          sx={{
            mt: 2,
            mb: 2,
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <img
            src={selectedImage}
            alt="Selected"
            style={{
              maxWidth: "100%",
              maxHeight: "300px",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          />
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={!selectedImage || isLoading}
        sx={{
          mt: 2,
          minWidth: "200px",
        }}
        size="large"
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          "単語を抽出する"
        )}
      </Button>

      {isLoading && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          画像から単語を抽出しています。しばらくお待ちください...
        </Typography>
      )}
    </Box>
  );
};

export default ImageUploader;
