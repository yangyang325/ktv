/**
 * 规范化行政区名称。
 * @param district 原始行政区
 * @returns 规范化后的行政区
 */
export function normalizeDistrictName(district: string): string {
  if (!district) {
    return district;
  }

  return district.endsWith("区") ? district : `${district}区`;
}

/**
 * 区域筛选选项。
 */
export const DISTRICT_OPTIONS = ["南山", "福田", "罗湖", "龙华", "宝安", "光明", "龙岗"];

/**
 * 价格档位选项。
 */
export const PRICE_LEVEL_OPTIONS = [
  { label: "¥100 以下", value: 1 },
  { label: "¥100-200", value: 2 },
  { label: "¥200 以上", value: 3 }
];

/**
 * 局标签选项。
 */
export const PARTY_TAG_OPTIONS = ["新手友好", "大包厢", "轻松唱", "生日活动"];

/**
 * 时长选项。
 */
export const DURATION_OPTIONS = [
  { label: "1 小时", value: 60 },
  { label: "1.5 小时", value: 90 },
  { label: "2 小时", value: 120 },
  { label: "3 小时", value: 180 },
  { label: "4 小时", value: 240 }
];

/**
 * 局状态文案映射。
 */
export const PARTY_STATUS_TEXT = {
  draft: "待发布",
  recruiting: "招募中",
  ongoing: "活动中",
  full: "已满员",
  closed: "已截止",
  cancelled: "已取消",
  finished: "已结束"
} as const;

/**
 * 报名状态文案映射。
 */
export const ENTRY_STATUS_TEXT = {
  confirmed: "已报名",
  waitlist: "候补中",
  quit: "已退出",
  removed: "已移除"
} as const;
