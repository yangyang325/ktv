import { getPartyList } from "../../services/api/party";

Page({
  data: {
    cityName: "成都市",
    partyList: [] as Awaited<ReturnType<typeof getPartyList>>,
    loading: true,
    actions: [
      { key: "create", icon: "👥", title: "我要组局", desc: "发起KTV局" },
      { key: "discover", icon: "⌕", title: "找局加入", desc: "发现好局" },
      { key: "mine", icon: "▣", title: "我的组局", desc: "管理局" },
      { key: "favorites", icon: "★", title: "我的收藏", desc: "收藏的局" }
    ]
  },

  /**
   * 页面展示时刷新局列表。
   */
  async onShow() {
    const partyList = await getPartyList();
    this.setData({
      partyList,
      loading: false
    });
  },

  /**
   * 处理首页快捷入口点击。
   * @param event 点击事件
   */
  handleActionTap(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    const routeMap: Record<string, string> = {
      create: "/pages/launch/index",
      discover: "/pages/discover/index",
      mine: "/pages/my-parties/index",
      favorites: "/pages/common/webview/index?title=我的收藏"
    };
    const url = routeMap[key];
    if (!url) {
      return;
    }

    if (key === "discover") {
      wx.switchTab({ url });
      return;
    }

    wx.navigateTo({ url });
  }
});
