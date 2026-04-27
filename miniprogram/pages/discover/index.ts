import { getPartyList } from "../../services/api/party";

Page({
  data: {
    keyword: "",
    activeTab: "recommend",
    tabs: [
      { key: "recommend", label: "推荐" },
      { key: "nearby", label: "附近" },
      { key: "latest", label: "最新" }
    ],
    filters: ["附近", "区域", "人数", "费用", "筛选"],
    partyList: [] as Awaited<ReturnType<typeof getPartyList>>
  },

  /**
   * 页面展示时加载可加入的局。
   */
  async onShow() {
    const partyList = await getPartyList();
    this.setData({ partyList });
  },

  /**
   * 切换发现页分类。
   * @param event 点击事件
   */
  handleTabChange(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    this.setData({ activeTab: key });
  },

  /**
   * 更新搜索关键词。
   * @param event 输入事件
   */
  handleKeywordInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
  }
});
