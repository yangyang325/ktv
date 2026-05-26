import type { Party } from "../../types/party";
import { callCloudFunction } from "./cloud";

interface FavoriteStatusResult {
  partyId: string;
  isFavorited: boolean;
}

/**
 * 判断活动是否已收藏。
 * @param partyId 活动 ID
 * @returns 是否已收藏
 */
export async function isPartyFavorited(partyId: string): Promise<boolean> {
  const result = await callCloudFunction<FavoriteStatusResult>("party", "favoriteStatus", { partyId });
  return result.isFavorited;
}

/**
 * 切换活动收藏状态。
 * @param partyId 活动 ID
 * @returns 切换后是否已收藏
 */
export async function togglePartyFavorite(partyId: string): Promise<boolean> {
  const result = await callCloudFunction<FavoriteStatusResult>("party", "favoriteToggle", { partyId });
  return result.isFavorited;
}

/**
 * 获取已收藏的活动详情列表。
 * @returns 已收藏活动列表
 */
export async function getFavoriteParties(): Promise<Party[]> {
  return callCloudFunction<Party[]>("party", "favoriteList", {});
}
