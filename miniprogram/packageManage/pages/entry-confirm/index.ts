import { getPartyDetail, joinParty } from "../../../services/api/party";

type PartyDetail = Awaited<ReturnType<typeof getPartyDetail>>;

Page({
  data: {
    partyId: "",
    detail: null as PartyDetail | null,
    displayTitle: "",
    displayTags: [] as string[],
    durationHourText: "3",
    capacityText: "6/10人",
    remainingCount: 4,
    distanceText: "1.35km",
    payAmount: "68",
    agreementChecked: false,
    submitting: false
  },

  /**
   * 初始化报名确认页数据。
   * @param options 页面路由参数
   */
  async onLoad(options: Record<string, string>) {
    const partyId = options.partyId || "party-001";
    this.setData({ partyId });
    await this.refreshDetail();
  },

  /**
   * 刷新活动确认信息。
   */
  async refreshDetail() {
    const detail = await getPartyDetail(this.data.partyId);
    this.setData({
      detail,
      displayTitle: this.formatDisplayTitle(detail.party.title),
      displayTags: this.buildDisplayTags(detail.party.tags),
      durationHourText: this.formatDurationHour(detail.party.durationMin),
      capacityText: this.formatCapacityText(detail.party.progressText, detail.party.confirmedCount, detail.party.maxCapacity),
      remainingCount: this.calculateRemainingCount(detail.party.progressText, detail.party.confirmedCount, detail.party.maxCapacity),
      payAmount: this.formatPayAmount(detail.party.priceText)
    });
  },

  /**
   * 格式化确认页活动标题。
   * @param title 原始活动标题
   * @returns 适合确认卡片展示的标题
   */
  formatDisplayTitle(title: string) {
    return title.replace("🎤", " / ").replace(/\s+/g, "").replace("/", " / ");
  },

  /**
   * 生成确认页活动标签。
   * @param tags 原始标签列表
   * @returns 确认页标签
   */
  buildDisplayTags(tags: string[]) {
    const normalizedTags = tags.filter((tag) => tag !== "流行");
    return ["清厅", ...normalizedTags].slice(0, 3);
  },

  /**
   * 格式化活动时长小时数。
   * @param durationMin 活动时长分钟数
   * @returns 小时文本
   */
  formatDurationHour(durationMin: number) {
    const durationHour = durationMin / 60;
    return Number.isInteger(durationHour) ? String(durationHour) : durationHour.toFixed(1);
  },

  /**
   * 格式化人数容量展示。
   * @param progressText 原始进度文本
   * @param confirmedCount 已确认人数
   * @param maxCapacity 最大容量
   * @returns 人数容量文本
   */
  formatCapacityText(progressText: string, confirmedCount: number, maxCapacity: number) {
    const matched = progressText.match(/\d+\s*\/\s*\d+/);
    if (matched) {
      return `${matched[0].replace(/\s/g, "")}人`;
    }

    return `${confirmedCount}/${maxCapacity}人`;
  },

  /**
   * 计算剩余名额数。
   * @param progressText 原始进度文本
   * @param confirmedCount 已确认人数
   * @param maxCapacity 最大容量
   * @returns 剩余名额
   */
  calculateRemainingCount(progressText: string, confirmedCount: number, maxCapacity: number) {
    const matched = progressText.match(/(\d+)\s*\/\s*(\d+)/);
    if (matched) {
      return Math.max(Number(matched[2]) - Number(matched[1]), 0);
    }

    return Math.max(maxCapacity - confirmedCount, 0);
  },

  /**
   * 格式化付款金额。
   * @param priceText 价格文本
   * @returns 金额数字文本
   */
  formatPayAmount(priceText: string) {
    const matched = priceText.match(/\d+(?:\.\d+)?/);
    return matched ? matched[0] : "0";
  },

  /**
   * 切换协议勾选状态。
   */
  toggleAgreement() {
    this.setData({
      agreementChecked: !this.data.agreementChecked
    });
  },

  /**
   * 打开活动参与协议。
   */
  openAgreement() {
    wx.navigateTo({
      url: `/pages/common/webview/index?title=${encodeURIComponent("组局活动参与协议")}`
    });
  },

  /**
   * 提交并确认报名。
   */
  async handleConfirm() {
    if (this.data.submitting) {
      return;
    }

    if (!this.data.agreementChecked) {
      wx.showToast({
        title: "请先同意参与协议",
        icon: "none"
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      await joinParty(this.data.partyId, "user-guest-3");
      wx.showToast({
        title: "报名成功",
        icon: "success"
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 600);
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "报名失败",
        icon: "none"
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
