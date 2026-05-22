import { serviceConfig } from "./services/config";
import { DEFAULT_CITY_NAME } from "./constants/location";

/**
 * 全局应用数据。
 */
interface IAppGlobalData {
  currentUserId: string;
  useMock: boolean;
}

/**
 * 应用实例类型。
 */
interface IAppOption {
  globalData: IAppGlobalData;
  onLaunch(): void;
}

App<IAppOption>({
  globalData: {
    currentUserId: "user-host",
    useMock: serviceConfig.dataSource !== "cloud"
  },

  /**
   * 小程序启动时初始化全局状态。
   */
  onLaunch() {
    if (serviceConfig.dataSource === "cloud" && wx.cloud) {
      wx.cloud.init({
        env: serviceConfig.cloudEnvId || undefined,
        traceUser: true
      });
    }

    if (!wx.getStorageSync("selectedCityName")) {
      wx.setStorageSync("selectedCityName", DEFAULT_CITY_NAME);
    }

    console.log("K 局小程序启动");
  }
});
