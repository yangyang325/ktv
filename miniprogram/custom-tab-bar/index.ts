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
        iconPath: "/assets/images/ktv/tab-home.png",
        selectedIconPath: "/assets/images/ktv/tab-home-active.png",
        text: "首页"
      },
      {
        pagePath: "pages/discover/index",
        iconPath: "/assets/images/ktv/tab-discover.png",
        selectedIconPath: "/assets/images/ktv/tab-discover-active.png",
        text: "发现"
      },
      {
        pagePath: "pages/messages/index",
        iconPath: "/assets/images/ktv/tab-messages.png",
        selectedIconPath: "/assets/images/ktv/tab-messages-active.png",
        text: "消息",
        badge: "3"
      },
      {
        pagePath: "pages/profile/index",
        iconPath: "/assets/images/ktv/tab-profile.png",
        selectedIconPath: "/assets/images/ktv/tab-profile-active.png",
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
