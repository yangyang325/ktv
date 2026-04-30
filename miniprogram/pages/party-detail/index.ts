import { ROUTES } from "../../constants/routes";
import { getPartyDetail, joinWaitlist } from "../../services/api/party";

type PartyDetail = Awaited<ReturnType<typeof getPartyDetail>>;
type DisplayTag = {
  label: string;
  tone: "blue" | "purple" | "red" | "pink";
};

Page({
  data: {
    partyId: "",
    detail: null as PartyDetail | null,
    confirmedUsers: [] as string[],
    waitlistUsers: [] as string[],
    displayTags: [] as DisplayTag[],
    remainingCount: 0,
    durationHourText: "3",
    statusBarHeight: 0
  },

  /**
   * 读取局详情路由参数并初始化自定义导航。
   */
  async onLoad(options: Record<string, string>) {
    this.setupNavigation();

    const partyId = options.partyId || "party-001";
    this.setData({ partyId });
    await this.refreshDetail();
  },

  /**
   * 页面回到前台时刷新报名人数。
   */
  onShow() {
    if (!this.data.partyId || !this.data.detail) {
      return;
    }

    void this.refreshDetail();
  },

  /**
   * 配置自定义导航栏状态栏高度。
   */
  setupNavigation() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 0
    });
  },

  /**
   * 刷新当前局详情展示数据。
   */
  async refreshDetail() {
    const detail = await getPartyDetail(this.data.partyId);
    this.setData({
      detail,
      confirmedUsers: detail.confirmedEntries.map((item) => item.userNickname),
      waitlistUsers: detail.waitlistEntries.map((item) => item.userNickname),
      displayTags: this.buildDisplayTags(detail.party.tags),
      remainingCount: Math.max(detail.party.maxCapacity - detail.party.confirmedCount, 0),
      durationHourText: this.formatDurationHour(detail.party.durationMin)
    });
  },

  /**
   * 生成带视觉色调的标签列表。
   * @param tags 原始标签列表
   * @returns 详情页展示标签
   */
  buildDisplayTags(tags: string[]) {
    const tones: DisplayTag["tone"][] = ["blue", "purple", "red", "pink"];
    const labels = tags.map((tag) => (tag === "流行" ? "流行歌曲" : tag));
    const mergedLabels = labels.includes("氛围好") ? labels : [...labels, "氛围好"];

    return mergedLabels.slice(0, 4).map((label, index) => ({
      label,
      tone: tones[index] || "blue"
    }));
  },

  /**
   * 格式化活动小时数。
   * @param durationMin 活动时长分钟数
   * @returns 小时展示文案
   */
  formatDurationHour(durationMin: number) {
    const durationHour = durationMin / 60;
    return Number.isInteger(durationHour) ? String(durationHour) : durationHour.toFixed(1);
  },

  /**
   * 返回上一页。
   */
  handleBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.switchTab({
      url: "/pages/home/index"
    });
  },

  /**
   * 打开更多操作菜单。
   */
  handleMore() {
    wx.showActionSheet({
      itemList: ["分享给朋友", "举报活动"],
      success: (result) => {
        if (result.tapIndex === 0) {
          wx.showToast({
            title: "可点右上角分享",
            icon: "none"
          });
        }

        if (result.tapIndex === 1) {
          wx.showToast({
            title: "已收到反馈",
            icon: "none"
          });
        }
      }
    });
  },

  /**
   * 展示导航占位反馈。
   */
  handleNavigate() {
    wx.showToast({
      title: "正在打开导航",
      icon: "none"
    });
  },

  /**
   * 联系发起人。
   */
  handleContactHost() {
    wx.showToast({
      title: "已提醒发起人联系你",
      icon: "none"
    });
  },

  /**
   * 打开报名确认页。
   */
  handleJoin() {
    wx.navigateTo({
      url: `${ROUTES.entryConfirm}?partyId=${this.data.partyId}`
    });
  },

  /**
   * 加入当前局候补。
   */
  async handleWaitlist() {
    const waitEntry = await joinWaitlist(this.data.partyId, "user-wait-1");
    await this.refreshDetail();
    wx.showToast({
      title: `已成为候补第 ${waitEntry.waitlistNo} 位`,
      icon: "none"
    });
  },

  /**
   * 构建分享给朋友的卡片信息。
   * @returns 分享配置
   */
  onShareAppMessage() {
    const detail = this.data.detail;
    return {
      title: detail?.party.title || "一起加入KTV组局",
      path: `/pages/party-detail/index?partyId=${this.data.partyId}`,
      imageUrl: detail?.party.coverImage
    };
  }
});
