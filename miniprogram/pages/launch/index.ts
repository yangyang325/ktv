Page({
  /**
   * 进入门店选择页。
   */
  handleCreateParty() {
    wx.navigateTo({
      url: "/packageCreate/pages/venue-picker/index"
    });
  },

  /**
   * 提示草稿能力即将接入。
   */
  handleResumeDraft() {
    wx.showToast({
      title: "草稿功能即将接入",
      icon: "none"
    });
  }
});
