import { ROUTES } from "../../constants/routes";
import { isPartyFavorited, togglePartyFavorite } from "../../services/api/favorite";
import { getPartyDetail, joinWaitlist } from "../../services/api/party";
import { resolvePartyStatusTone } from "../../utils/party-status";

type PartyDetail = Awaited<ReturnType<typeof getPartyDetail>>;
type DisplayTag = {
  label: string;
};
type ContactEntry = {
  entryId: string;
  userNickname: string;
  entryStatusText: string;
  contactMethodLabel: string;
  contactValue: string;
  arrivalTimeText: string;
  note: string;
};

Page({
  data: {
    partyId: "",
    detail: null as PartyDetail | null,
    confirmedUsers: [] as string[],
    waitlistUsers: [] as string[],
    contactEntries: [] as ContactEntry[],
    canViewContacts: false,
    displayTags: [] as DisplayTag[],
    remainingCount: 0,
    isFavorited: false,
    statusTone: "signup",
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
      contactEntries: this.buildContactEntries(detail),
      canViewContacts: Boolean(detail.canViewContacts),
      displayTags: this.buildDisplayTags(detail.party.tags),
      remainingCount: Math.max(detail.party.maxCapacity - detail.party.confirmedCount, 0),
      isFavorited: isPartyFavorited(detail.party.partyId),
      statusTone: resolvePartyStatusTone(detail.party.status, detail.party.statusText),
      durationHourText: this.formatDurationHour(detail.party.durationMin)
    });
  },

  /**
   * 生成带视觉色调的标签列表。
   * @param tags 原始标签列表
   * @returns 详情页展示标签
   */
  buildDisplayTags(tags: string[]) {
    const labels = tags.map((tag) => (tag === "流行" ? "流行歌曲" : tag));
    const mergedLabels = labels.includes("氛围好") ? labels : [...labels, "氛围好"];

    return mergedLabels.slice(0, 4).map((label) => ({
      label
    }));
  },

  /**
   * 构建发起人可见的报名联系信息列表。
   * @param detail 活动详情
   * @returns 联系信息展示列表
   */
  buildContactEntries(detail: PartyDetail) {
    return [...detail.confirmedEntries, ...detail.waitlistEntries]
      .filter((entry) => Boolean(entry.contactInfo?.value))
      .map((entry) => ({
        entryId: entry.entryId,
        userNickname: entry.userNickname,
        entryStatusText: entry.entryType === "waitlist" ? `候补 ${entry.waitlistNo || ""}`.trim() : `已报名 ${entry.seqNo || ""}`.trim(),
        contactMethodLabel: entry.contactInfo?.method === "phone" ? "手机号" : "微信号",
        contactValue: entry.contactInfo?.value || "",
        arrivalTimeText: entry.contactInfo?.arrivalTime || "未填写",
        note: entry.contactInfo?.note || ""
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
   * 复制活动地点信息。
   */
  handleCopyVenueLocation() {
    const party = this.data.detail?.party;
    const venueText = this.buildCopyVenueText(party?.venueSummary || "", party?.venueAddress || "");
    if (!venueText) {
      wx.showToast({
        title: "暂无地点信息",
        icon: "none"
      });
      return;
    }

    wx.setClipboardData({
      data: venueText,
      success: () => {
        wx.showToast({
          title: "地点已复制",
          icon: "success"
        });
      }
    });
  },

  /**
   * 生成可复制的活动地点文本。
   * @param venueSummary 场所名称或位置摘要
   * @param venueAddress 详细地址
   * @returns 可复制的地点文本
   */
  buildCopyVenueText(venueSummary: string, venueAddress: string) {
    return [venueSummary.trim(), venueAddress.trim()].filter(Boolean).join("\n");
  },

  /**
   * 发送活动提醒。
   */
  handleContactHost() {
    wx.showToast({
      title: "已记录活动提醒",
      icon: "none"
    });
  },

  /**
   * 切换当前活动收藏状态。
   */
  handleFavoriteTap() {
    if (!this.data.partyId) {
      return;
    }

    const isFavorited = togglePartyFavorite(this.data.partyId);
    this.setData({ isFavorited });
    wx.showToast({
      title: isFavorited ? "已收藏" : "已取消收藏",
      icon: "none"
    });
  },

  /**
   * 打开发起人可见的报名详情页。
   */
  handleOpenEntryDetails() {
    wx.navigateTo({
      url: `${ROUTES.partyMembers}?partyId=${this.data.partyId}`
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
      title: detail?.party.title || "深圳K歌兴趣活动",
      path: `/pages/party-detail/index?partyId=${this.data.partyId}`,
      imageUrl: detail?.party.coverImage
    };
  }
});
