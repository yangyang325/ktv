import type { PartyStatus } from "../types/common";

/**
 * 活动状态视觉色调。
 */
export type PartyStatusTone = "signup" | "active" | "full" | "finished";

/**
 * 根据活动状态与文案解析统一的状态色调。
 * @param status 活动状态
 * @param statusText 活动状态文案
 * @returns 状态色调
 */
export function resolvePartyStatusTone(status?: PartyStatus | string, statusText = ""): PartyStatusTone {
  if (status === "finished" || status === "closed" || status === "cancelled") {
    return "finished";
  }

  if (status === "full") {
    return "full";
  }

  if (statusText.includes("进行中")) {
    return "active";
  }

  return "signup";
}
