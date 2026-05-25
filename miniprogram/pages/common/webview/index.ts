Page({
  data: {
    title: "活动说明",
    description:
      "本工具仅用于记录深圳K歌兴趣活动信息。活动费用为线下AA参考，小程序不收款；参与前请自行确认时间、地点、人数和现场安排。"
  },

  /**
   * 初始化说明页标题并同步微信原生导航栏。
   * @param options 页面路由参数
   */
  onLoad(options: Record<string, string>) {
    const title = options.title ? decodeURIComponent(options.title) : this.data.title;

    this.setData({
      title
    });
    wx.setNavigationBarTitle({
      title
    });
  }
});
