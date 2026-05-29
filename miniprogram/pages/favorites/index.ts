import {
  DEFAULT_PROFILE_AVATAR_IMAGES,
  DISCOVER_TAB_ICONS,
  HOME_TAB_ICONS,
  PROFILE_TAB_ICONS
} from "../../constants/assets";
import { ROUTES } from "../../constants/routes";
import { getFavoriteParties } from "../../services/api/favorite";
import { getFollowingUsers } from "../../services/api/follow";
import type { Party } from "../../types/party";
import type { User } from "../../types/user";

type FavoritesTabKey = "activities" | "users";

interface FavoriteStat {
  key: string;
  label: string;
  value: number;
  icon: string;
  tone: string;
}

interface FavoritesTab {
  key: FavoritesTabKey;
  label: string;
  active: boolean;
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
      tab?: FavoritesTabKey;
      userId?: string;
    };
  };
}

Page({
  data: {
    bottomNav: createBottomNav(),
    currentTab: "activities" as FavoritesTabKey,
    defaultAvatarUrl: DEFAULT_PROFILE_AVATAR_IMAGES[0],
    favoriteParties: [] as Party[],
    followedUsers: [] as User[],
    showFavoriteParties: false,
    showFollowedUsers: false,
    tabs: createTabs(),
    stats: createStats()
  },

  /**
   * 页面展示时刷新收藏数据。
   */
  async onShow() {
    await this.refreshFavorites();
  },

  /**
   * 刷新收藏活动、关注用户列表和统计。
   */
  async refreshFavorites() {
    const [favoriteParties, followedUsers] = await Promise.all([
      getFavoriteParties(),
      getFollowingUsers()
    ]);
    const { currentTab } = this.data;

    this.setData({
      favoriteParties,
      followedUsers,
      showFavoriteParties: favoriteParties.length > 0,
      showFollowedUsers: followedUsers.length > 0,
      tabs: createTabs(currentTab),
      stats: createStats(favoriteParties.length, followedUsers.length)
    });
  },

  /**
   * 切换收藏内容标签。
   * @param event 点击事件
   */
  handleTabTap(event: FavoritesTapEvent) {
    const { tab } = event.currentTarget.dataset;
    if (tab !== "activities" && tab !== "users") {
      return;
    }

    this.setData({
      currentTab: tab,
      tabs: createTabs(tab)
    });
  },

  /**
   * 打开发起者资料页。
   * @param event 点击事件
   */
  handleUserTap(event: FavoritesTapEvent) {
    const { userId } = event.currentTarget.dataset;
    if (!userId) {
      return;
    }

    wx.navigateTo({
      url: `${ROUTES.hostProfile}?userId=${userId}`
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
 * 创建收藏统计数据。
 * @param activityCount 收藏活动数量
 * @param userCount 关注用户数量
 * @returns 收藏统计项
 */
function createStats(activityCount = 0, userCount = 0): FavoriteStat[] {
  return [
    {
      key: "activities",
      label: "收藏活动",
      value: activityCount,
      icon: "/assets/images/ktv/collection-activity.svg",
      tone: "purple"
    },
    {
      key: "users",
      label: "关注用户",
      value: userCount,
      icon: "/assets/images/ktv/follow-user.svg",
      tone: "orange"
    }
  ];
}

/**
 * 创建收藏页内容标签。
 * @param activeKey 当前选中的标签
 * @returns 收藏页标签项
 */
function createTabs(activeKey: FavoritesTabKey = "activities"): FavoritesTab[] {
  return [
    { key: "activities", label: "活动", active: activeKey === "activities" },
    { key: "users", label: "用户", active: activeKey === "users" }
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
