import { getNotificationList } from "../../services/api/notify";
import type { Notification } from "../../types/notification";

type MessageTabKey = "notice";

interface MessageTab {
  key: MessageTabKey;
  label: string;
  hasDot?: boolean;
}

interface ConversationItem {
  id: string;
  avatarType: "notice" | "activity";
  name: string;
  role?: string;
  roleType?: "official";
  preview: string;
  time: string;
  unread: number;
}

interface TabChangeEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      key?: MessageTabKey;
    };
  };
}

Page({
  data: {
    activeTab: "notice" as MessageTabKey,
    tabs: [
      { key: "notice", label: "通知", hasDot: false }
    ] as MessageTab[],
    conversations: [] as ConversationItem[],
    loading: true
  },

  /**
   * 页面展示时同步底部导航高亮并读取云端通知。
   */
  async onShow() {
    this.getTabBar().setData({ selected: 2 });
    await this.refreshNotifications();
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
      activeTab: key
    });
  },

  /**
   * 从云端刷新当前用户通知。
   */
  async refreshNotifications() {
    try {
      const notifications = await getNotificationList();
      const conversations = createConversations(notifications);
      this.setData({
        conversations,
        loading: false,
        tabs: [
          {
            key: "notice",
            label: "通知",
            hasDot: conversations.some((item) => item.unread > 0)
          }
        ]
      });
    } catch (error) {
      this.setData({
        conversations: [],
        loading: false,
        tabs: [{ key: "notice", label: "通知", hasDot: false }]
      });
      wx.showToast({
        title: error instanceof Error ? error.message : "通知加载失败",
        icon: "none"
      });
    }
  }
});

/**
 * 将云端通知转换为消息列表展示项。
 * @param notifications 云端通知列表
 * @returns 消息列表展示项
 */
function createConversations(notifications: Notification[]): ConversationItem[] {
  return notifications.map((notification) => ({
    id: notification.notificationId,
    avatarType: notification.type === "activity" ? "activity" : "notice",
    name: notification.title || "通知",
    role: notification.type === "system" ? "官方" : undefined,
    roleType: notification.type === "system" ? "official" : undefined,
    preview: notification.content || "你有一条新的活动通知",
    time: formatNotificationTime(notification.createdAt),
    unread: notification.read ? 0 : 1
  }));
}

/**
 * 格式化通知时间。
 * @param createdAt 通知创建时间
 * @returns 页面展示时间
 */
function formatNotificationTime(createdAt: string): string {
  if (!createdAt) {
    return "";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}
