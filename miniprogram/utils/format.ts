const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/**
 * 将数字补齐为两位字符。
 * @param value 原始数字
 * @returns 补零后的文本
 */
export function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 将分转换成人民币字符串。
 * @param cents 分为单位的金额
 * @returns 格式化后的金额
 */
export function formatCurrencyYuan(cents: number): string {
  const yuan = cents / 100;
  const value = Number.isInteger(yuan) ? `${yuan}` : yuan.toFixed(2);
  return `¥${value}`;
}

/**
 * 计算预计人均费用。
 * @param roomFee 包厢总费用，单位分
 * @param maxCapacity 人数上限
 * @returns 人均费用，单位分
 */
export function calculateEstimatedPerPerson(roomFee: number, maxCapacity: number): number {
  if (maxCapacity <= 0) {
    return 0;
  }

  return Math.ceil(roomFee / maxCapacity);
}

/**
 * 将分钟时长格式化为中文小时文本。
 * @param durationMin 时长，单位分钟
 * @returns 中文时长文案
 */
export function formatDurationMin(durationMin: number): string {
  const hour = durationMin / 60;
  return Number.isInteger(hour) ? `${hour} 小时` : `${hour.toFixed(1)} 小时`;
}

/**
 * 将用户填写的小时数转换为分钟数。
 * @param durationHour 用户填写的小时数
 * @returns 分钟数，非法输入返回 NaN
 */
export function parseDurationHourToMinutes(durationHour: string | number): number {
  const hour = typeof durationHour === "number" ? durationHour : Number(durationHour.trim());
  if (!Number.isFinite(hour) || hour <= 0) {
    return Number.NaN;
  }

  return Math.round(hour * 60);
}

/**
 * 获取星期文本。
 * @param dateText ISO 日期文本
 * @returns 星期文本
 */
export function formatWeekday(dateText: string): string {
  const date = new Date(dateText);
  return WEEKDAY_LABELS[date.getDay()];
}

/**
 * 构建页面时间摘要。
 * @param date 日期文本
 * @param time 时间文本
 * @param durationMin 时长，单位分钟
 * @returns 用于页面展示的时间摘要
 */
export function buildTimeSummary(date: string, time: string, durationMin: number): string {
  return `${date} ${time} · ${formatDurationMin(durationMin)}`;
}

/**
 * 将开始时间和时长格式化为招募摘要。
 * @param startTime 开始时间
 * @param durationMin 时长，单位分钟
 * @returns 招募时间摘要
 */
export function formatPartyDateTime(startTime: string, durationMin: number): string {
  const date = new Date(startTime);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = padNumber(date.getHours());
  const minutes = padNumber(date.getMinutes());
  return `${month}月${day}日 ${formatWeekday(startTime)} ${hours}:${minutes}，共 ${formatDurationMin(durationMin)}`;
}

/**
 * 拼装场地摘要。
 * @param venueName 场地名称
 * @param district 行政区
 * @returns 场地摘要
 */
export function formatVenueSummary(venueName: string, district: string): string {
  return `${venueName} · ${district}`;
}
