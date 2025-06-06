/**
 * 特定の日数を加算した日付を返す
 * @param date 基準となる日付
 * @param days 加算する日数
 * @returns 加算後の日付
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(date.getDate() + days);
  return result;
}

/**
 * 日付の差分を日数で返す
 * @param date1 日付1
 * @param date2 日付2
 * @returns 日付の差分（日数）
 */
export function diffDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 間隔反復計算
 * 復習スケジュール用の次回学習日を計算する
 * @param reviewCount 復習回数
 * @returns 次回復習までの日数
 */
export function calculateNextReviewDays(reviewCount: number): number {
  // 間隔は 1→3→7→14→30→90→180 日...と増加
  const intervals = [1, 3, 7, 14, 30, 90, 180];
  const index = Math.min(reviewCount, intervals.length - 1);
  return intervals[index];
}

/**
 * 今日の日付を YYYY-MM-DD 形式で返す
 * @returns YYYY-MM-DD 形式の文字列
 */
export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * 日付文字列が今日以前かどうか確認する
 * @param dateString YYYY-MM-DD 形式の日付文字列
 * @returns 今日以前であれば true
 */
export function isDateOnOrBeforeToday(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate <= today;
}
