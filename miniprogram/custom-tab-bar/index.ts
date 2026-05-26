import { DISCOVER_TAB_ICONS, HOME_TAB_ICONS, PROFILE_TAB_ICONS } from "../constants/assets";

interface TabBarItem {
  pagePath: string;
  iconPath: string;
  selectedIconPath: string;
  text: string;
  badge?: string;
}

interface SwitchTabEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      index?: number | string;
      path?: string;
    };
  };
}

Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "pages/home/index",
        iconPath: HOME_TAB_ICONS.default,
        selectedIconPath: HOME_TAB_ICONS.active,
        text: "首页"
      },
      {
        pagePath: "pages/discover/index",
        iconPath: DISCOVER_TAB_ICONS.default,
        selectedIconPath: DISCOVER_TAB_ICONS.active,
        text: "发现"
      },
      {
        pagePath: "pages/profile/index",
        iconPath: PROFILE_TAB_ICONS.default,
        selectedIconPath: PROFILE_TAB_ICONS.active,
        text: "我的"
      }
    ] as TabBarItem[]
  },

  lifetimes: {
    /**
     * 组件挂载时同步当前选中项。
     */
    attached() {
      this.updateSelected();
    }
  },

  pageLifetimes: {
    /**
     * 页面展示时同步当前选中项。
     */
    show() {
      this.updateSelected();
    }
  },

  methods: {
    /**
     * 根据当前页面路由更新选中项。
     */
    updateSelected() {
      const pages = getCurrentPages();
      const currentRoute = pages[pages.length - 1]?.route;
      const selected = this.data.list.findIndex((item) => item.pagePath === currentRoute);
      if (selected >= 0 && selected !== this.data.selected) {
        this.setData({ selected });
      }
    },

    /**
     * 切换底部导航页面。
     * @param event 点击事件
     */
    switchTab(event: SwitchTabEvent) {
      const { index, path } = event.currentTarget.dataset;
      const selected = Number(index);

      if (Number.isInteger(selected) && selected !== this.data.selected) {
        this.setData({ selected });
      }

      if (!path) {
        return;
      }

      wx.switchTab({
        url: `/${path}`
      });
    }
  }
});
