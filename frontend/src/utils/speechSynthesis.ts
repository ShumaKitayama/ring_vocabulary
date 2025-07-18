// Web Speech APIを使用した読み上げ機能

/**
 * 指定されたテキストを読み上げる
 * @param text 読み上げるテキスト
 * @param lang 言語コード（デフォルト: 'en-US'）
 * @param rate 読み上げ速度（0.1-10、デフォルト: 0.8）
 * @param pitch 音の高さ（0-2、デフォルト: 1）
 * @returns Promise<void>
 */
export const speakText = (
  text: string,
  lang: string = "en-US",
  rate: number = 0.8,
  pitch: number = 1
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("お使いのブラウザは音声合成機能をサポートしていません"));
      return;
    }

    // 既存の音声を停止
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.8;

    utterance.onend = () => resolve();
    utterance.onerror = (event) =>
      reject(new Error(`音声読み上げエラー: ${event.error}`));

    window.speechSynthesis.speak(utterance);
  });
};

/**
 * 英単語を読み上げる（英語の音声で）
 * @param word 読み上げる英単語
 * @returns Promise<void>
 */
export const speakEnglishWord = (word: string): Promise<void> => {
  return speakText(word, "en-US", 0.7, 1);
};

/**
 * 日本語の意味を読み上げる（日本語の音声で）
 * @param meaning 読み上げる日本語の意味
 * @returns Promise<void>
 */
export const speakJapaneseMeaning = (meaning: string): Promise<void> => {
  return speakText(meaning, "ja-JP", 0.8, 1);
};

/**
 * 音声合成機能がサポートされているかチェック
 * @returns boolean
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return "speechSynthesis" in window;
};

/**
 * 現在の音声読み上げを停止
 */
export const stopSpeaking = (): void => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * 利用可能な音声リストを取得
 * @returns SpeechSynthesisVoice[]
 */
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (!("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
};

/**
 * 指定された言語の音声を取得
 * @param lang 言語コード
 * @returns SpeechSynthesisVoice | null
 */
export const getVoiceByLanguage = (
  lang: string
): SpeechSynthesisVoice | null => {
  const voices = getAvailableVoices();
  return voices.find((voice) => voice.lang.includes(lang)) || null;
};
