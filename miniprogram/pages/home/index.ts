import { getPartyList } from "../../services/api/party";
import { HOME_QUICK_ACTION_IMAGES } from "../../constants/assets";
import { DEFAULT_CITY_NAME } from "../../constants/location";

/**
 * 从位置文案里提取城市级展示名称。
 * @param text 位置名称或详细地址
 * @returns 城市级展示名称
 */
function extractCityNameFromText(text: string): string {
  const trimmedText = text.trim();
  const cityMatch = trimmedText.match(/([\u4e00-\u9fa5]{2,20}(?:市|自治州|地区|盟))/);

  return cityMatch?.[1] || trimmedText;
}

/**
 * 解析用户选择的位置展示城市。
 * @param location 微信位置选择结果
 * @returns 首页城市展示文案
 */
function resolveChosenCityName(location: WechatMiniprogram.ChooseLocationSuccessCallbackResult): string {
  const address = (location.address || "").trim();
  const name = (location.name || "").trim();

  return extractCityNameFromText(address || name);
}

Page({
  data: {
    cityName: DEFAULT_CITY_NAME,
    cityPicking: false,
    partyList: [] as Awaited<ReturnType<typeof getPartyList>>,
    loading: true,
    actions: [
      {
        key: "create",
        iconUrl: HOME_QUICK_ACTION_IMAGES.createParty,
        title: "我要组局",
        desc: "发起KTV局"
      },
      {
        key: "discover",
        iconUrl: HOME_QUICK_ACTION_IMAGES.discoverParty,
        title: "找局加入",
        desc: "发现好局"
      },
      {
        key: "mine",
        iconUrl: HOME_QUICK_ACTION_IMAGES.myParties,
        title: "我的组局",
        desc: "管理局"
      },
      {
        key: "favorites",
        iconUrl: HOME_QUICK_ACTION_IMAGES.favorites,
        title: "我的收藏",
        desc: "收藏的局"
      }
    ]
  },

  /**
   * 页面加载时读取缓存城市。
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
   * 点击城市时选择当前位置。
   */
  async handleCityTap() {
    if (this.data.cityPicking) {
      return;
    }

    this.setData({ cityPicking: true });

    try {
      const location = await wx.chooseLocation({});
      const cityName = resolveChosenCityName(location);

      if (!cityName) {
        wx.showToast({
          title: "请选择位置",
          icon: "none"
        });
        this.setData({ cityPicking: false });
        return;
      }

      wx.setStorageSync("selectedCityName", cityName);
      this.setData({
        cityName,
        cityPicking: false
      });
    } catch (error) {
      this.setData({ cityPicking: false });
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("cancel")) {
        wx.showToast({
          title: "未选择位置",
          icon: "none"
        });
      }
    }
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
