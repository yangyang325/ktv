import { getMyPartyTabs } from "../../services/api/party";
import type { Party } from "../../types/party";

Page({
  data: {
    currentTab: "hosting",
    tabs: [
      { key: "hosting", label: "发起中" },
      { key: "joined", label: "参与中" },
      { key: "waitlist", label: "候补中" },
      { key: "history", label: "历史" }
    ],
    partyList: [] as Party[],
    groupedParties: {
      hosting: [] as Party[],
      joined: [] as Party[],
      waitlist: [] as Party[],
      history: [] as Party[]
    }
  },

  /**
   * 页面展示时刷新我的局数据。
   */
  async onShow() {
    const groupedParties = await getMyPartyTabs("user-host");
    this.setData({
      groupedParties,
      partyList: groupedParties[this.data.currentTab as keyof typeof groupedParties]
    });
  },

  /**
   * 切换我的局分页。
   */
  handleTabChange(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    this.setData({
      currentTab: key,
      partyList: this.data.groupedParties[key as keyof typeof this.data.groupedParties]
    });
  }
});
