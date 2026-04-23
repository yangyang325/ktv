import { getPartyDetail, joinParty, joinWaitlist } from "../../services/api/party";
import type { Entry } from "../../types/entry";

Page({
  data: {
    partyId: "",
    detail: null as Awaited<ReturnType<typeof getPartyDetail>> | null,
    confirmedUsers: [] as string[],
    waitlistUsers: [] as string[]
  },

  /**
   * 读取局详情路由参数。
   */
  async onLoad(options: Record<string, string>) {
    const partyId = options.partyId || "party-001";
    const detail = await getPartyDetail(partyId);
    this.setData({
      partyId,
      detail,
      confirmedUsers: detail.confirmedEntries.map((item) => item.userNickname),
      waitlistUsers: detail.waitlistEntries.map((item) => item.userNickname)
    });
  },

  /**
   * 正式报名当前局。
   */
  async handleJoin() {
    try {
      await joinParty(this.data.partyId, "user-guest-3");
      const detail = await getPartyDetail(this.data.partyId);
      this.setData({
        detail,
        confirmedUsers: detail.confirmedEntries.map((item) => item.userNickname),
        waitlistUsers: detail.waitlistEntries.map((item) => item.userNickname)
      });
      wx.showToast({
        title: "报名成功",
        icon: "success"
      });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "报名失败",
        icon: "none"
      });
    }
  },

  /**
   * 加入当前局候补。
   */
  async handleWaitlist() {
    const waitEntry = await joinWaitlist(this.data.partyId, "user-wait-1");
    const detail = await getPartyDetail(this.data.partyId);
    this.setData({
      detail,
      confirmedUsers: detail.confirmedEntries.map((item) => item.userNickname),
      waitlistUsers: detail.waitlistEntries.map((item) => item.userNickname)
    });
    wx.showToast({
      title: `已成为候补第 ${waitEntry.waitlistNo} 位`,
      icon: "none"
    });
  },

  /**
   * 跳转到成员管理页。
   */
  handleManageMembers() {
    wx.navigateTo({
      url: "/packageManage/pages/party-members/index"
    });
  }
});
