import { getPartyList } from "../../services/api/party";

Page({
  data: {
    cityName: "成都市",
    cityOptions: ["成都市", "重庆市", "深圳市", "广州市", "上海市"],
    partyList: [] as Awaited<ReturnType<typeof getPartyList>>,
    loading: true,
    actions: [
      {
        key: "create",
        iconUrl: "/assets/images/ktv/quick-create-party.png",
        title: "我要组局",
        desc: "发起KTV局"
      },
      {
        key: "discover",
        iconUrl: "/assets/images/ktv/quick-discover-party.png",
        title: "找局加入",
        desc: "发现好局"
      },
      {
        key: "mine",
        iconUrl: "/assets/images/ktv/quick-my-parties.png",
        title: "我的组局",
        desc: "管理局"
      },
      {
        key: "favorites",
        iconUrl: "/assets/images/ktv/quick-favorites.png",
        title: "我的收藏",
        desc: "收藏的局"
      }
    ]
  },

  /**
   * 页面加载时读取已选择城市。
   */
  onLoad() {
    const cityName = wx.getStorageSync("selectedCityName");
    if (cityName) {
      this.setData({ cityName });
    }
  },

  /**
   * 页面展示时刷新局列表。
   */
  async onShow() {
    this.getTabBar().setData({ selected: 0 });

    const partyList = await getPartyList();
    this.setData({
      partyList,
      loading: false
    });
  },

  /**
   * 打开城市选择面板。
   */
  handleCityTap() {
    wx.showActionSheet({
      itemList: this.data.cityOptions,
      success: (result) => {
        const cityName = this.data.cityOptions[result.tapIndex];
        if (!cityName) {
          return;
        }

        wx.setStorageSync("selectedCityName", cityName);
        this.setData({ cityName });
      }
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
