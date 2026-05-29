/**
 * 通用接口响应体。
 */
export interface ApiResult<T> {
  data: T;
  message: string;
}

/**
 * 局状态枚举。
 */
export type PartyStatus = "draft" | "recruiting" | "ongoing" | "full" | "closed" | "cancelled" | "finished";

/**
 * 报名状态枚举。
 */
export type EntryType = "confirmed" | "waitlist" | "quit" | "removed";

/**
 * 我的局聚合分组。
 */
export interface MyPartyTabs<T> {
  hosting: T[];
  joined: T[];
  waitlist: T[];
  history: T[];
}
