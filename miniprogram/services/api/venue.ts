import { normalizeDistrictName } from "../../constants/options";
import { venueList } from "../../mock/venues";
import type { Venue } from "../../types/venue";
import { serviceConfig } from "../config";
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
 * 按门店编号同步读取门店。
 * @param venueId 门店 ID
 * @returns 门店信息
 */
export function getVenueByIdSync(venueId: string) {
  for (const venue of venueList) {
    if (venue.venueId === venueId) {
      return normalizeVenue(venue);
    }
  }

  return null;
}

/**
 * 获取门店列表。
 * @param filters 查询条件
 * @returns 门店列表
 */
export async function getVenueList(filters?: {
  district?: string;
  keyword?: string;
  priceLevel?: string | number;
}) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<Venue[]>("venue", "list", filters || {});
  }

  const result = [];

  for (const venue of venueList) {
    const normalizedVenue = normalizeVenue(venue);

    if (filters?.district && normalizedVenue.district !== filters.district) {
      continue;
    }

    if (
      filters?.priceLevel !== undefined &&
      String(normalizedVenue.priceLevel) !== String(filters.priceLevel)
    ) {
      continue;
    }

    if (filters?.keyword && !matchesVenueKeyword(normalizedVenue, filters.keyword)) {
      continue;
    }

    result.push(normalizedVenue);
  }

  return result;
}

/**
 * 按门店编号异步读取门店。
 * @param venueId 门店 ID
 * @returns 门店信息
 */
export async function getVenueById(venueId: string) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<Venue>("venue", "detail", { venueId });
  }

  return getVenueByIdSync(venueId);
}
