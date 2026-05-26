import { serviceConfig } from "./services/config";

/**
 * 全局应用数据。
 */
interface IAppGlobalData {}

/**
 * 应用实例类型。
 */
interface IAppOption {
  globalData: IAppGlobalData;
  onLaunch(): void;
}

App<IAppOption>({
  globalData: {},

  /**
   * 小程序启动时初始化全局状态。
   */
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: serviceConfig.cloudEnvId || undefined,
        traceUser: true
      });
    }

    console.log("K 局小程序启动");
  }
});
