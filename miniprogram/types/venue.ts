/**
 * KTV 门店信息。
 */
export interface Venue {
  venueId: string;
  name: string;
  district: string;
  address: string;
  lng: number;
  lat: number;
  priceLevel: 1 | 2 | 3;
  roomTypes: string[];
  businessHours: string;
  coverImage: string;
  avgRating: number;
  isActive: boolean;
}
