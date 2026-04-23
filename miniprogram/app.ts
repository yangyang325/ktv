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
    useMock: true
  },

  /**
   * 小程序启动时初始化全局状态。
   */
  onLaunch() {
    console.log("K 局小程序启动");
  }
});
