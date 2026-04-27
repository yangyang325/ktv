Page({
  data: {
    profile: {
      nickname: "小麦麦",
      intro: "K歌，只因遇到对的朋友",
      stats: [
        { label: "发起组局", value: "12" },
        { label: "参与次数", value: "28" },
        { label: "收藏", value: "36" }
      ],
      tags: ["快乐", "老歌星辰", "纯唱派", "互相陪唱"]
    },
    shortcuts: [
      { key: "favorites", icon: "♥", label: "我的收藏" },
      { key: "notes", icon: "▣", label: "随笔记录" },
      { key: "groups", icon: "☻", label: "我的群聊" },
      { key: "reviews", icon: "⋯", label: "我的评价" }
    ],
    menu: ["隐私设置", "帮助与反馈", "联系客服", "关于我们"]
  },

  /**
   * 打开我的组局页面。
   */
  handleOpenMyParties() {
    wx.navigateTo({
      url: "/pages/my-parties/index"
    });
  }
});
