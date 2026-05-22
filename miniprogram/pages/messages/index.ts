type MessageTabKey = "notice";

interface MessageTab {
  key: MessageTabKey;
  label: string;
  hasDot?: boolean;
}

interface PortraitMember {
  name: string;
  tone: string;
  shirt: string;
}

interface ConversationItem {
  id: string;
  avatarType: "single" | "group" | "notice" | "activity";
  members?: PortraitMember[];
  name: string;
  role?: string;
  roleType?: "plain" | "official";
  preview: string;
  time: string;
  unread: number;
  online?: boolean;
}

interface TabChangeEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      key?: MessageTabKey;
    };
  };
}

const noticeConversations: ConversationItem[] = [
  {
    id: "notice-system",
    avatarType: "notice",
    name: "系统通知",
    role: "官方",
    roleType: "official",
    preview: "您的组局已被确认，快去准备选歌吧！",
    time: "昨天",
    unread: 1
  },
  {
    id: "notice-activity",
    avatarType: "activity",
    name: "活动助手",
    preview: "报名成功通知：您已成功报名活动",
    time: "周三",
    unread: 0
  }
];

Page({
  data: {
    activeTab: "notice" as MessageTabKey,
    tabs: [
      { key: "notice", label: "通知", hasDot: true }
    ] as MessageTab[],
    conversations: noticeConversations
  },

  /**
   * 页面展示时同步底部导航高亮。
   */
  onShow() {
    this.getTabBar().setData({ selected: 2 });
  },

  /**
   * 切换消息页分页，并刷新当前会话列表。
   * @param event 点击分页时传入的事件对象。
   */
  handleTabChange(event: TabChangeEvent) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.activeTab) {
      return;
    }

    this.setData({
      activeTab: key,
      conversations: this.getConversationsByTab(key)
    });
  },

  /**
   * 根据当前分页返回需要展示的会话数据。
   * @param tab 当前选中的消息分页。
   * @returns 当前分页下的会话列表。
   */
  getConversationsByTab(_tab: MessageTabKey) {
    return noticeConversations;
  }
});
