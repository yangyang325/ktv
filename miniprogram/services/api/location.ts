import { locationConfig } from "../config";

interface TencentMapAddressComponent {
  province?: string;
  city?: string;
  district?: string;
}

interface TencentMapReverseGeocoderResponse {
  status: number;
  message?: string;
  result?: {
    address_component?: TencentMapAddressComponent;
  };
}

/**
 * 构建腾讯地图逆地址解析请求地址。
 * @param latitude 纬度
 * @param longitude 经度
 * @param key 腾讯地图 WebService Key
 * @returns 请求地址
 */
export function buildTencentMapReverseGeocoderUrl(latitude: number, longitude: number, key: string): string {
  const location = encodeURIComponent(`${latitude},${longitude}`);
  const encodedKey = encodeURIComponent(key);

  return `https://apis.map.qq.com/ws/geocoder/v1/?location=${location}&key=${encodedKey}&get_poi=0`;
}

/**
 * 从腾讯地图地址组件中读取城市名。
 * @param addressComponent 地址组件
 * @returns 城市名
 */
export function resolveCityFromAddressComponent(addressComponent?: TencentMapAddressComponent): string {
  return addressComponent?.city || addressComponent?.district || addressComponent?.province || "";
}

/**
 * 请求腾讯地图逆地址解析接口。
 * @param url 请求地址
 * @returns 逆地址解析响应
 */
function requestReverseGeocoder(url: string): Promise<TencentMapReverseGeocoderResponse> {
  return new Promise((resolve, reject) => {
    wx.request<TencentMapReverseGeocoderResponse>({
      url,
      method: "GET",
      success(response) {
        resolve(response.data);
      },
      fail(error) {
        reject(new Error(error.errMsg || "城市解析失败"));
      }
    });
  });
}

/**
 * 根据经纬度自动解析城市。
 * @param latitude 纬度
 * @param longitude 经度
 * @returns 城市名
 */
export async function reverseGeocodeCity(latitude: number, longitude: number): Promise<string> {
  const mapKey = locationConfig.tencentMapKey.trim();

  if (!mapKey) {
    throw new Error("请配置腾讯地图 Key");
  }

  if (typeof wx === "undefined" || typeof wx.request !== "function") {
    throw new Error("当前环境不支持定位解析");
  }

  const response = await requestReverseGeocoder(buildTencentMapReverseGeocoderUrl(latitude, longitude, mapKey));

  if (response.status !== 0) {
    throw new Error(response.message || "城市解析失败");
  }

  const city = resolveCityFromAddressComponent(response.result?.address_component);
  if (!city) {
    throw new Error("未识别到城市");
  }

  return city;
}
