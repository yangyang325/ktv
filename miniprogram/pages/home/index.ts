import { getPartyList } from "../../services/api/party";
import { HOME_QUICK_ACTION_IMAGES } from "../../constants/assets";
import { DEFAULT_CITY_NAME } from "../../constants/location";

Page({
  data: {
    cityName: DEFAULT_CITY_NAME,
    partyList: [] as Awaited<ReturnType<typeof getPartyList>>,
    loading: true,
    actions: [
      {
        key: "create",
        iconUrl: HOME_QUICK_ACTION_IMAGES.createParty,
        title: "发布活动",
        desc: "记录K歌信息"
      },
      {
        key: "discover",
        iconUrl: HOME_QUICK_ACTION_IMAGES.discoverParty,
        title: "活动列表",
        desc: "查看可报名"
      },
      {
        key: "mine",
        iconUrl: HOME_QUICK_ACTION_IMAGES.myParties,
        title: "我的活动",
        desc: "管理记录"
      },
      {
        key: "favorites",
        iconUrl: HOME_QUICK_ACTION_IMAGES.favorites,
        title: "我的收藏",
        desc: "收藏和关注"
      }
    ]
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
   * 处理首页快捷入口点击。
   * @param event 点击事件
   */
  handleActionTap(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    const routeMap: Record<string, string> = {
      create: "/pages/launch/index",
      discover: "/pages/discover/index",
      mine: "/pages/my-parties/index",
      favorites: "/pages/favorites/index"
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
  },

  /**
   * 跳转到发现页查看更多活动。
   */
  handleMoreTap() {
    wx.switchTab({ url: "/pages/discover/index" });
  },

  /**
   * 构建首页分享给朋友的卡片信息。
   * @returns 分享配置
   */
  onShareAppMessage() {
    return {
      title: "深圳K歌兴趣活动",
      path: "/pages/home/index"
    };
  },

  /**
   * 构建首页分享到朋友圈的信息。
   * @returns 分享配置
   */
  onShareTimeline() {
    return {
      title: "深圳K歌兴趣活动",
      query: ""
    };
  }
});
