/**
 * 将数字补齐为两位字符串。
 * @param value 数字
 * @returns 两位字符串
 */
function padDateNumber(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 获取今天日期。
 * @returns YYYY-MM-DD 格式日期
 */
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = padDateNumber(now.getMonth() + 1);
  const day = padDateNumber(now.getDate());

  return `${year}-${month}-${day}`;
}

/**
 * 构建活动时间展示文案。
 * @param date 日期
 * @param startTime 开始时间
 * @returns 活动时间文案
 */
export function buildActivityTimeText(date: string, startTime: string): string {
  if (date && startTime) {
    return `${date} ${startTime}`;
  }

  if (date) {
    return `${date} 选择时间`;
  }

  if (startTime) {
    return `选择日期 ${startTime}`;
  }

  return "选择日期与时间";
}
