import { getFavoriteParties } from "../../services/api/favorite";
import type { Party } from "../../types/party";

type FavoriteTabKey = "all" | "activities" | "songs" | "users";

interface FavoriteTab {
  key: FavoriteTabKey;
  label: string;
}

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
      key?: FavoriteTabKey;
      path?: string;
    };
  };
}

Page({
  data: {
    bottomNav: createBottomNav(),
    currentTab: "all" as FavoriteTabKey,
    favoriteParties: [] as Party[],
    showFavoriteParties: false,
    stats: createStats(),
    tabs: createTabs()
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
    const currentTab = this.data.currentTab;

    this.setData({
      favoriteParties,
      showFavoriteParties: shouldShowFavoriteParties(currentTab, favoriteParties),
      stats: createStats(favoriteParties.length)
    });
  },

  /**
   * 切换收藏分类。
   * @param event 点击事件
   */
  handleTabTap(event: FavoritesTapEvent) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.currentTab) {
      return;
    }

    this.setData({
      currentTab: key,
      showFavoriteParties: shouldShowFavoriteParties(key, this.data.favoriteParties)
    });
  },

  /**
   * 跳转发现页。
   */
  handleDiscoverTap() {
    wx.switchTab({ url: "/pages/discover/index" });
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
 * 创建收藏统计数据。
 * @returns 收藏统计项
 */
function createStats(activityCount = 0): FavoriteStat[] {
  return [
    { key: "activities", label: "收藏活动", value: activityCount, icon: "书", tone: "purple" },
    { key: "songs", label: "收藏歌单", value: 0, icon: "音", tone: "blue" },
    { key: "users", label: "收藏用户", value: 0, icon: "人", tone: "orange" }
  ];
}

/**
 * 创建收藏分类标签。
 * @returns 收藏分类标签
 */
function createTabs(): FavoriteTab[] {
  return [
    { key: "all", label: "全部" },
    { key: "activities", label: "活动" },
    { key: "songs", label: "歌单" },
    { key: "users", label: "用户" }
  ];
}

/**
 * 判断当前分类是否展示收藏活动列表。
 * @param tabKey 当前分类
 * @param favoriteParties 收藏活动列表
 * @returns 是否展示活动列表
 */
function shouldShowFavoriteParties(tabKey: FavoriteTabKey, favoriteParties: Party[]): boolean {
  return (tabKey === "all" || tabKey === "activities") && favoriteParties.length > 0;
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
      icon: "/assets/images/ktv/tab-home.png",
      activeIcon: "/assets/images/ktv/tab-home-active.png",
      active: false
    },
    {
      key: "discover",
      label: "发现",
      path: "pages/discover/index",
      icon: "/assets/images/ktv/tab-discover.png",
      activeIcon: "/assets/images/ktv/tab-discover-active.png",
      active: false
    },
    {
      key: "messages",
      label: "消息",
      path: "pages/messages/index",
      icon: "/assets/images/ktv/tab-messages.png",
      activeIcon: "/assets/images/ktv/tab-messages-active.png",
      active: false,
      badge: "3"
    },
    {
      key: "profile",
      label: "我的",
      path: "pages/profile/index",
      icon: "/assets/images/ktv/tab-profile.png",
      activeIcon: "/assets/images/ktv/tab-profile-active.png",
      active: true
    }
  ];
}
