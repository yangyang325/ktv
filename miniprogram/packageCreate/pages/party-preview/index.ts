import { DEFAULT_PARTY_COVER_IMAGE } from "../../../constants/assets";
import { buildTimeSummary, calculateEstimatedPerPerson, formatCurrencyYuan } from "../../../utils/format";
import { buildPartyRecruitmentText } from "../../../utils/party-text";
import { validatePartyForm } from "../../../utils/validators";
import { createPartyDraft, publishParty } from "../../../services/api/party";
import type { Party } from "../../../types/party";
import type { User } from "../../../types/user";

interface PartyDraftCache {
  title: string;
  venueId: string;
  venueSummary: string;
  startDate: string;
  startTime: string;
  durationMin: number;
  roomFee: number;
  maxCapacity: number;
  notes: string;
  tags?: string[];
  coverImage?: string;
}

Page({
  data: {
    previewText: "",
    estimatedPrice: "",
    publishing: false
  },

  /**
   * 初始化接龙预览内容。
   */
  onLoad() {
    const draft = wx.getStorageSync("partyDraftForm") as PartyDraftCache | undefined;

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
      tags: draft.tags || [],
      coverImage: draft.coverImage || DEFAULT_PARTY_COVER_IMAGE,
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
   * 创建并发布组局。
   */
  async handlePublish() {
    if (this.data.publishing) {
      return;
    }

    const draft = wx.getStorageSync("partyDraftForm") as PartyDraftCache | undefined;

    if (!draft) {
      wx.showToast({
        title: "请先填写组局信息",
        icon: "none"
      });
      return;
    }

    const validation = validatePartyForm({
      title: draft.title,
      venueId: draft.venueId,
      venueSummary: draft.venueSummary,
      startDate: draft.startDate,
      startTime: draft.startTime,
      durationMin: draft.durationMin,
      roomFee: draft.roomFee,
      maxCapacity: draft.maxCapacity,
      notes: draft.notes,
      tags: draft.tags || [],
      coverImage: draft.coverImage || ""
    });

    if (!validation.valid) {
      wx.showToast({
        title: validation.message,
        icon: "none"
      });
      return;
    }

    this.setData({ publishing: true });

    try {
      const createdParty = await createPartyDraft({
        title: draft.title,
        venueId: draft.venueId,
        venueSummary: draft.venueSummary,
        startDate: draft.startDate,
        startTime: draft.startTime,
        durationMin: draft.durationMin,
        roomFee: draft.roomFee,
        maxCapacity: draft.maxCapacity,
        notes: draft.notes,
        tags: draft.tags || [],
        coverImage: draft.coverImage || ""
      });
      const publishedParty = await publishParty(createdParty.partyId);

      wx.removeStorageSync("partyDraftForm");
      wx.showToast({
        title: "发布成功",
        icon: "success"
      });
      wx.redirectTo({
        url: `/pages/party-detail/index?partyId=${publishedParty.partyId}`
      });
    } catch (error) {
      wx.showToast({
        title: "发布失败，请稍后重试",
        icon: "none"
      });
      this.setData({ publishing: false });
    }
  }
});
