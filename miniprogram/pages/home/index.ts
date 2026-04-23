import { getPartyList } from "../../services/api/party";

Page({
  data: {
    heroTitle: "周末想唱就组一个 K 局",
    heroDesc: "快速发起、自动接龙、报名候补一页看清。",
    partyList: [] as Awaited<ReturnType<typeof getPartyList>>,
    loading: true
  },

  /**
   * 页面展示时刷新局列表。
   */
  async onShow() {
    const partyList = await getPartyList();
    this.setData({
      partyList,
      loading: false
    });
  }
});
