import type { Venue } from "../types/venue";

/**
 * 门店模拟数据。
 */
export const venueList: Venue[] = [
  {
    venueId: "venue-001",
    name: "MUSE KTV · 南山海岸城店",
    district: "南山",
    address: "深圳市南山区海岸城东座 3 楼",
    lng: 113.934,
    lat: 22.53,
    priceLevel: 2,
    roomTypes: ["中包", "大包"],
    businessHours: "11:00-06:00",
    coverImage: "",
    avgRating: 4.6,
    isActive: true
  },
  {
    venueId: "venue-002",
    name: "纯K · 车公庙店",
    district: "福田",
    address: "深圳市福田区车公庙商圈",
    lng: 114.045,
    lat: 22.536,
    priceLevel: 3,
    roomTypes: ["中包", "豪华包"],
    businessHours: "13:00-04:00",
    coverImage: "",
    avgRating: 4.7,
    isActive: true
  }
];
