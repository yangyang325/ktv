import type { Party } from "../../types/party";
import { getPartyDetail } from "./party";

export const FAVORITE_PARTY_STORAGE_KEY = "ktv.favoritePartyIds";

const memoryStorage = new Map<string, unknown>();

/**
 * 读取收藏存储内容。
 * @param key 存储键
 * @returns 存储内容
 */
function getStorageValue(key: string): unknown {
  if (typeof wx !== "undefined" && wx.getStorageSync) {
    return wx.getStorageSync(key);
  }

  return memoryStorage.get(key);
}

/**
 * 写入收藏存储内容。
 * @param key 存储键
 * @param value 存储内容
 */
function setStorageValue(key: string, value: unknown): void {
  if (typeof wx !== "undefined" && wx.setStorageSync) {
    wx.setStorageSync(key, value);
    return;
  }

  memoryStorage.set(key, value);
}

/**
 * 去重并清洗活动 ID 列表。
 * @param partyIds 活动 ID 列表
 * @returns 清洗后的活动 ID 列表
 */
function normalizeFavoritePartyIds(partyIds: unknown): string[] {
  if (!Array.isArray(partyIds)) {
    return [];
  }

  return Array.from(new Set(partyIds.filter((partyId): partyId is string => Boolean(partyId?.trim()))));
}

/**
 * 获取已收藏的活动 ID。
 * @returns 活动 ID 列表
 */
export function getFavoritePartyIds(): string[] {
  return normalizeFavoritePartyIds(getStorageValue(FAVORITE_PARTY_STORAGE_KEY));
}

/**
 * 判断活动是否已收藏。
 * @param partyId 活动 ID
 * @returns 是否已收藏
 */
export function isPartyFavorited(partyId: string): boolean {
  return getFavoritePartyIds().includes(partyId);
}

/**
 * 收藏活动。
 * @param partyId 活动 ID
 * @returns 收藏后的活动 ID 列表
 */
export function addFavoriteParty(partyId: string): string[] {
  const normalizedPartyId = partyId.trim();
  if (!normalizedPartyId) {
    return getFavoritePartyIds();
  }

  const nextPartyIds = [
    normalizedPartyId,
    ...getFavoritePartyIds().filter((favoritePartyId) => favoritePartyId !== normalizedPartyId)
  ];
  setStorageValue(FAVORITE_PARTY_STORAGE_KEY, nextPartyIds);

  return nextPartyIds;
}

/**
 * 取消收藏活动。
 * @param partyId 活动 ID
 * @returns 取消后的活动 ID 列表
 */
export function removeFavoriteParty(partyId: string): string[] {
  const normalizedPartyId = partyId.trim();
  const nextPartyIds = getFavoritePartyIds().filter((favoritePartyId) => favoritePartyId !== normalizedPartyId);
  setStorageValue(FAVORITE_PARTY_STORAGE_KEY, nextPartyIds);

  return nextPartyIds;
}

/**
 * 切换活动收藏状态。
 * @param partyId 活动 ID
 * @returns 切换后是否已收藏
 */
export function togglePartyFavorite(partyId: string): boolean {
  if (isPartyFavorited(partyId)) {
    removeFavoriteParty(partyId);
    return false;
  }

  addFavoriteParty(partyId);
  return true;
}

/**
 * 获取已收藏的活动详情列表。
 * @returns 已收藏活动列表
 */
export async function getFavoriteParties(): Promise<Party[]> {
  const favoritePartyIds = getFavoritePartyIds();
  const parties = await Promise.all(
    favoritePartyIds.map(async (partyId) => {
      try {
        const detail = await getPartyDetail(partyId);
        return detail.party;
      } catch (error) {
        return null;
      }
    })
  );

  return parties.filter((party): party is Party => Boolean(party));
}
