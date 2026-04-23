import { buildTimeSummary, calculateEstimatedPerPerson, formatCurrencyYuan } from "../../../utils/format";
import { buildPartyRecruitmentText } from "../../../utils/party-text";
import type { Party } from "../../../types/party";
import type { User } from "../../../types/user";

Page({
  data: {
    previewText: "",
    estimatedPrice: ""
  },

  /**
   * 初始化接龙预览内容。
   */
  onLoad() {
    const draft = wx.getStorageSync("partyDraftForm") as
      | {
          title: string;
          venueId: string;
          venueSummary: string;
          startDate: string;
          startTime: string;
          durationMin: number;
          roomFee: number;
          maxCapacity: number;
          notes: string;
        }
      | undefined;

    if (!draft) {
      return;
    }

    const estimatedPerPerson = calculateEstimatedPerPerson(draft.roomFee, draft.maxCapacity);
    const previewParty: Party = {
      partyId: "preview-party",
      title: draft.title,
      venueId: draft.venueId,
      venueCustom: "",
      hostId: "user-host",
      startTime: `${draft.startDate}T${draft.startTime}:00+08:00`,
      durationMin: draft.durationMin,
      roomFee: draft.roomFee,
      maxCapacity: draft.maxCapacity,
      status: "draft",
      isPublic: false,
      notes: draft.notes,
      tags: [],
      createdAt: new Date().toISOString(),
      confirmedCount: 1,
      waitlistCount: 0,
      estimatedPerPerson,
      hostSummary: "羊羊",
      venueSummary: draft.venueSummary,
      progressText: `1 / ${draft.maxCapacity}`,
      statusText: "草稿",
      priceText: `人均约 ${formatCurrencyYuan(estimatedPerPerson)}`,
      timeSummary: buildTimeSummary(draft.startDate, draft.startTime, draft.durationMin)
    };

    const host: User = {
      userId: "user-host",
      nickname: "羊羊",
      avatarUrl: "",
      createdAt: new Date().toISOString()
    };

    this.setData({
      previewText: buildPartyRecruitmentText(previewParty, [], host),
      estimatedPrice: formatCurrencyYuan(estimatedPerPerson)
    });
  },

  /**
   * 复制接龙文案。
   */
  handleCopy() {
    wx.setClipboardData({
      data: this.data.previewText
    });
  },

  /**
   * 提示发布流程待接入。
   */
  handlePublish() {
    wx.showToast({
      title: "发布流程即将接入",
      icon: "none"
    });
  }
});
