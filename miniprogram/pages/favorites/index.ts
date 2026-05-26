import { DISCOVER_TAB_ICONS, HOME_TAB_ICONS, PROFILE_TAB_ICONS } from "../../constants/assets";
import { getFavoriteParties } from "../../services/api/favorite";
import type { Party } from "../../types/party";

interface FavoriteStat {
  key: string;
  label: string;
  value: number;
  icon: string;
  tone: string;
}

interface BottomNavItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  activeIcon: string;
  active: boolean;
  badge?: string;
}

interface FavoritesTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      path?: string;
    };
  };
}

Page({
  data: {
    bottomNav: createBottomNav(),
    favoriteParties: [] as Party[],
    showFavoriteParties: false,
    stats: createStats()
  },

  /**
   * 页面展示时刷新收藏数据。
   */
  async onShow() {
    await this.refreshFavorites();
  },

  /**
   * 刷新收藏活动列表和统计。
   */
  async refreshFavorites() {
    const favoriteParties = await getFavoriteParties();

    this.setData({
      favoriteParties,
      showFavoriteParties: favoriteParties.length > 0,
      stats: createStats(favoriteParties.length)
    });
  },

  /**
   * 切换底部导航。
   * @param event 点击事件
   */
  handleBottomNavTap(event: FavoritesTapEvent) {
    const { path } = event.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.switchTab({
      url: `/${path}`
    });
  }
});

/**
 * 创建收藏活动统计数据。
 * @param activityCount 收藏活动数量
 * @returns 收藏统计项
 */
function createStats(activityCount = 0): FavoriteStat[] {
  return [
    { key: "activities", label: "收藏活动", value: activityCount, icon: "书", tone: "purple" }
  ];
}

/**
 * 创建底部导航配置。
 * @returns 底部导航项
 */
function createBottomNav(): BottomNavItem[] {
  return [
    {
      key: "home",
      label: "首页",
      path: "pages/home/index",
      icon: HOME_TAB_ICONS.default,
      activeIcon: HOME_TAB_ICONS.active,
      active: false
    },
    {
      key: "discover",
      label: "发现",
      path: "pages/discover/index",
      icon: DISCOVER_TAB_ICONS.default,
      activeIcon: DISCOVER_TAB_ICONS.active,
      active: false
    },
    {
      key: "profile",
      label: "我的",
      path: "pages/profile/index",
      icon: PROFILE_TAB_ICONS.default,
      activeIcon: PROFILE_TAB_ICONS.active,
      active: true
    }
  ];
}
