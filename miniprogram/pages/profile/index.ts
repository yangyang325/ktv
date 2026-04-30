interface NavigationMetrics {
  statusBarHeight: number;
  navigationBarHeight: number;
  navigationHeight: number;
}

interface ProfileTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      key?: string;
      label?: string;
    };
  };
}

/**
 * 生成默认自定义导航栏尺寸。
 * @returns 导航栏尺寸配置
 */
function createDefaultNavigationMetrics(): NavigationMetrics {
  return {
    statusBarHeight: 24,
    navigationBarHeight: 44,
    navigationHeight: 68
  };
}

/**
 * 计算适配微信胶囊按钮的自定义导航栏尺寸。
 * @returns 导航栏尺寸配置
 */
function createNavigationMetrics(): NavigationMetrics {
  const fallback = createDefaultNavigationMetrics();

  try {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || fallback.statusBarHeight;
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const topGap = Math.max(menuButton.top - statusBarHeight, 4);
    const navigationBarHeight = menuButton.height + topGap * 2;

    return {
      statusBarHeight,
      navigationBarHeight,
      navigationHeight: statusBarHeight + navigationBarHeight
    };
  } catch (error) {
    return fallback;
  }
}

Page({
  data: {
    navigationMetrics: createDefaultNavigationMetrics(),
    profile: {
      nickname: "小麦麦",
      avatarUrl: "/assets/images/ktv/profile-avatar.svg",
      intro: "K歌，只因遇到好的朋友 🎤",
      stats: [
        { label: "发起组局", value: "12" },
        { label: "参与次数", value: "28" },
        { label: "收藏", value: "36" }
      ],
      tags: ["求玩", "爱唱歌", "找同伴", "现场控"]
    },
    shortcuts: [
      { key: "favorites", iconUrl: "/assets/images/ktv/profile-favorite.svg", label: "我的收藏" },
      { key: "notes", iconUrl: "/assets/images/ktv/profile-note.svg", label: "随便记录" },
      { key: "groups", iconUrl: "/assets/images/ktv/profile-chat.svg", label: "我的群聊" },
      { key: "reviews", iconUrl: "/assets/images/ktv/profile-review.svg", label: "我的评价" }
    ],
    menu: [
      { key: "privacy", iconUrl: "/assets/images/ktv/profile-menu-privacy.svg", label: "隐私设置" },
      { key: "feedback", iconUrl: "/assets/images/ktv/profile-menu-feedback.svg", label: "帮助与反馈" },
      { key: "service", iconUrl: "/assets/images/ktv/profile-menu-service.svg", label: "联系客服" },
      { key: "about", iconUrl: "/assets/images/ktv/profile-menu-about.svg", label: "关于我们" }
    ]
  },

  /**
   * 页面加载时计算自定义导航栏尺寸。
   */
  onLoad() {
    this.setData({
      navigationMetrics: createNavigationMetrics()
    });
  },

  /**
   * 页面展示时同步底部导航高亮。
   */
  onShow() {
    this.getTabBar().setData({ selected: 3 });
  },

  /**
   * 打开编辑资料入口。
   */
  handleEditProfile() {
    wx.showToast({
      title: "编辑资料待开放",
      icon: "none"
    });
  },

  /**
   * 处理快捷入口点击。
   * @param event 点击事件
   */
  handleShortcutTap(event: ProfileTapEvent) {
    const { key, label } = event.currentTarget.dataset;

    if (key === "favorites") {
      wx.navigateTo({
        url: "/pages/common/webview/index?title=我的收藏"
      });
      return;
    }

    wx.showToast({
      title: `${label || "功能"}待开放`,
      icon: "none"
    });
  },

  /**
   * 处理设置菜单点击。
   * @param event 点击事件
   */
  handleMenuTap(event: ProfileTapEvent) {
    const { label } = event.currentTarget.dataset;

    wx.showToast({
      title: `${label || "功能"}待开放`,
      icon: "none"
    });
  }
});
