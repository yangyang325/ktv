import { normalizeDistrictName } from "../../constants/options";
import type { Venue } from "../../types/venue";
import { callCloudFunction } from "./cloud";

/**
 * 深拷贝纯数据。
 * @param value 原始数据
 * @returns 深拷贝后的数据
 */
export function clonePlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 规范化门店数据，补齐页面友好字段。
 * @param venue 原始门店数据
 * @returns 规范化后的门店数据
 */
export function normalizeVenue<T extends { district: string }>(venue: T): T & { district: string } {
  return {
    ...clonePlainValue(venue),
    district: normalizeDistrictName(venue.district)
  };
}

/**
 * 判断门店是否匹配关键词。
 * @param venue 门店数据
 * @param keyword 搜索关键词
 * @returns 是否匹配
 */
export function matchesVenueKeyword(
  venue: { name: string; district: string; address: string },
  keyword: string
): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const targetText = `${venue.name} ${normalizeDistrictName(venue.district)} ${venue.address}`.toLowerCase();
  return targetText.includes(normalizedKeyword);
}

/**
 * 获取云端门店列表。
 * @param filters 查询条件
 * @returns 门店列表
 */
export async function getVenueList(filters?: {
  district?: string;
  keyword?: string;
  priceLevel?: string | number;
}) {
  return callCloudFunction<Venue[]>("venue", "list", filters || {});
}

/**
 * 按门店编号异步读取云端门店。
 * @param venueId 门店 ID
 * @returns 门店信息
 */
export async function getVenueById(venueId: string) {
  return callCloudFunction<Venue>("venue", "detail", { venueId });
}
