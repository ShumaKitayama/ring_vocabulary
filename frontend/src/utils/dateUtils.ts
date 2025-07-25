// 日付操作のユーティリティ関数

/**
 * 指定した日数を現在の日付に加算する
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * 現在日時から指定日付までの日数を計算する（日付のみで比較）
 */
export const getDaysFromNow = (dateString: string): number => {
  const targetDate = new Date(dateString);
  const now = new Date();

  // 時間部分を0にして日付のみで比較
  targetDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - targetDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 相対的な日付文字列を返す
 */
export const formatRelativeDate = (dateString: string): string => {
  const daysAgo = getDaysFromNow(dateString);

  if (daysAgo === 0) {
    return "今日";
  } else if (daysAgo === 1) {
    return "昨日";
  } else if (daysAgo < 7) {
    return `${daysAgo}日前`;
  } else if (daysAgo < 30) {
    const weeksAgo = Math.floor(daysAgo / 7);
    return `${weeksAgo}週間前`;
  } else if (daysAgo < 365) {
    const monthsAgo = Math.floor(daysAgo / 30);
    return `${monthsAgo}ヶ月前`;
  } else {
    const yearsAgo = Math.floor(daysAgo / 365);
    return `${yearsAgo}年前`;
  }
};

/**
 * 復習の推奨度を計算する
 */
export const calculateStudyRecommendation = (
  lastStudyDate: string | null,
  masteredCount: number,
  totalCount: number
): "urgent" | "recommended" | "maintenance" | "completed" => {
  if (!lastStudyDate) return "urgent";

  const daysAgo = getDaysFromNow(lastStudyDate);
  const masteryRate = totalCount > 0 ? masteredCount / totalCount : 0;

  if (daysAgo >= 7) return "urgent";
  if (daysAgo >= 3 || masteryRate < 0.5) return "recommended";
  if (masteryRate < 0.8) return "maintenance";
  return "completed";
};

export const dateUtils = {
  addDays,
  getDaysFromNow,
  formatRelativeDate,
  calculateStudyRecommendation,
};
