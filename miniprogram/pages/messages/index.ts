type MessageTabKey = "chat" | "notice";

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

const chatConversations: ConversationItem[] = [
  {
    id: "host",
    avatarType: "single",
    members: [{ name: "小麦麦", tone: "warm", shirt: "blue" }],
    name: "小麦麦",
    role: "发起人",
    roleType: "plain",
    preview: "这次KTV团建玩的很开心～",
    time: "19:30",
    unread: 2,
    online: true
  },
  {
    id: "weekend",
    avatarType: "group",
    members: [
      { name: "小麦麦", tone: "warm", shirt: "white" },
      { name: "阿然", tone: "rose", shirt: "dark" },
      { name: "朵朵", tone: "fair", shirt: "white" },
      { name: "可乐", tone: "peach", shirt: "dark" }
    ],
    name: "周末嗨唱群聊",
    role: "7人",
    roleType: "plain",
    preview: "小麦麦：大家来了吗？可以开麦啦🎤",
    time: "19:10",
    unread: 1
  },
  {
    id: "team",
    avatarType: "group",
    members: [
      { name: "麦霸", tone: "warm", shirt: "pink" },
      { name: "晴晴", tone: "fair", shirt: "white" },
      { name: "小雨", tone: "rose", shirt: "dark" },
      { name: "阿杰", tone: "peach", shirt: "blue" }
    ],
    name: "快乐K歌小分队",
    preview: "麦霸：周五不见不散呀！",
    time: "昨天",
    unread: 0
  },
  {
    id: "system",
    avatarType: "notice",
    name: "系统通知",
    role: "官方",
    roleType: "official",
    preview: "您的组局已被确认，快去准备选歌吧！",
    time: "昨天",
    unread: 1
  },
  {
    id: "assistant",
    avatarType: "activity",
    name: "活动助手",
    preview: "报名成功通知：您已成功报名活动",
    time: "周三",
    unread: 0
  }
];

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
    activeTab: "chat" as MessageTabKey,
    tabs: [
      { key: "chat", label: "聊天" },
      { key: "notice", label: "通知", hasDot: true }
    ] as MessageTab[],
    conversations: chatConversations,
    showNoticeCard: true
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
   * 关闭页面底部的消息通知引导卡片。
   */
  handleCloseNoticeCard() {
    this.setData({ showNoticeCard: false });
  },

  /**
   * 根据当前分页返回需要展示的会话数据。
   * @param tab 当前选中的消息分页。
   * @returns 当前分页下的会话列表。
   */
  getConversationsByTab(tab: MessageTabKey) {
    return tab === "notice" ? noticeConversations : chatConversations;
  }
});
