Page({
  data: {
    activeTab: "chat",
    tabs: [
      { key: "chat", label: "聊天" },
      { key: "notice", label: "通知" }
    ],
    conversations: [
      {
        id: "host",
        avatar: "麦",
        name: "小麦麦",
        role: "发起人",
        preview: "这次声音超给力快来我起一...",
        time: "19:30",
        unread: 2,
        color: "purple"
      },
      {
        id: "weekend",
        avatar: "周",
        name: "周末嗨唱群",
        role: "群",
        preview: "小麦麦：大家来了没?可以开麦啦",
        time: "19:10",
        unread: 1,
        color: "blue"
      },
      {
        id: "team",
        avatar: "快",
        name: "快乐K歌小分队",
        role: "",
        preview: "麦霸：周五不见不散呀！",
        time: "昨天",
        unread: 0,
        color: "pink"
      },
      {
        id: "system",
        avatar: "铃",
        name: "系统通知",
        role: "官方",
        preview: "您的组局已被确认，快去准备这波吧！",
        time: "昨天",
        unread: 1,
        color: "green"
      },
      {
        id: "assistant",
        avatar: "助",
        name: "活动助手",
        role: "",
        preview: "报名成功通知：您已成功报名活动",
        time: "周三",
        unread: 0,
        color: "orange"
      }
    ]
  },

  /**
   * 切换消息页分页。
   * @param event 点击事件
   */
  handleTabChange(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    this.setData({ activeTab: key });
  }
});
