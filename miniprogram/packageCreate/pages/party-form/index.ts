import { getVenueList } from "../../../services/api/venue";
import { createPartyDraft, publishParty } from "../../../services/api/party";
import { uploadPartyCover } from "../../../services/api/upload";
import { getTodayDate } from "../../../utils/date";
import { validatePartyForm } from "../../../utils/validators";

interface PartyTagOption {
  name: string;
  selected: boolean;
}

interface TagTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      tag?: string;
    };
  };
}

interface PickerChangeEvent extends WechatMiniprogram.BaseEvent {
  detail: {
    value: string;
  };
}

interface PreferenceChangeEvent extends WechatMiniprogram.BaseEvent {
  detail: {
    value: number | string;
  };
}

interface CapacityStepEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      step?: number | string;
    };
  };
}

/**
 * 格式化用户选择的 KTV 场所位置。
 * @param location 位置选择结果
 * @returns 场所展示文案
 */
function formatChosenVenueSummary(location: WechatMiniprogram.ChooseLocationSuccessCallbackResult): string {
  const name = (location.name || "").trim();
  const address = (location.address || "").trim();

  if (name && address && !address.includes(name)) {
    return `${name} · ${address}`;
  }

  return name || address;
}

Page({
  data: {
    venueId: "",
    venueSummary: "选择KTV位置",
    coverImage: "",
    coverPreviewPath: "",
    uploadingCover: false,
    publishing: false,
    todayDate: getTodayDate(),
    preferenceIndex: 0,
    preferenceOptions: ["不限", "女生优先", "男生优先", "18-25岁", "26-35岁", "35岁以上"],
    form: {
      title: "羊羊的 K 歌局",
      date: "2026-04-25",
      startTime: "19:30",
      duration: "180",
      roomFee: "2400",
      maxCapacity: "12",
      preference: "不限",
      notes: "欢迎新人，不限歌路。"
    },
    tags: ["流行", "粤语", "经典老歌", "90后", "80后", "友好局", "麦霸局", "气氛好"].map((name) => ({
      name,
      selected: false
    })) as PartyTagOption[],
    selectedTags: [] as string[]
  },

  /**
   * 初始化门店摘要。
   */
  async onLoad(options: Record<string, string>) {
    const venueId = options.venueId || "";
    if (!venueId) {
      return;
    }

    const venueList = await getVenueList();
    const currentVenue = venueList.find((item) => item.venueId === venueId);
    this.setData({
      venueId,
      venueSummary: currentVenue ? `${currentVenue.name} · ${currentVenue.district}` : "自定义门店"
    });
  },

  /**
   * 更新表单字段值。
   */
  handleFieldChange(event: WechatMiniprogram.Input) {
    const { field } = event.currentTarget.dataset as { field: string };
    const value = event.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
  },

  /**
   * 切换属性标签选中状态。
   * @param event 点击事件
   */
  handleTagTap(event: TagTapEvent) {
    const tag = event.currentTarget.dataset.tag;
    if (!tag) {
      return;
    }

    const tags = this.data.tags.map((item) => (item.name === tag ? { ...item, selected: !item.selected } : item));
    const selectedTags = tags.filter((item) => item.selected).map((item) => item.name);
    this.setData({ tags, selectedTags });
  },

  /**
   * 更新活动日期。
   * @param event 日期选择事件
   */
  handleDateChange(event: PickerChangeEvent) {
    this.setData({
      "form.date": event.detail.value
    });
  },

  /**
   * 选择 KTV 场所位置。
   */
  async handleVenueLocationTap() {
    try {
      const location = await wx.chooseLocation({});
      const venueSummary = formatChosenVenueSummary(location);

      if (!venueSummary) {
        wx.showToast({
          title: "请选择KTV位置",
          icon: "none"
        });
        return;
      }

      this.setData({
        venueId: "custom-location",
        venueSummary
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("cancel")) {
        wx.showToast({
          title: "未选择KTV位置",
          icon: "none"
        });
      }
    }
  },

  /**
   * 更新活动开始时间。
   * @param event 时间选择事件
   */
  handleStartTimeChange(event: PickerChangeEvent) {
    this.setData({
      "form.startTime": event.detail.value
    });
  },

  /**
   * 更新性别年龄偏好。
   * @param event 选择器变更事件
   */
  handlePreferenceChange(event: PreferenceChangeEvent) {
    const preferenceIndex = Number(event.detail.value);
    const preference = this.data.preferenceOptions[preferenceIndex];
    if (!preference) {
      return;
    }

    this.setData({
      preferenceIndex,
      "form.preference": preference
    });
  },

  /**
   * 调整预计人数上限。
   * @param event 点击事件
   */
  handleCapacityStep(event: CapacityStepEvent) {
    const step = Number(event.currentTarget.dataset.step);
    if (!Number.isFinite(step)) {
      return;
    }

    const currentCapacity = Number(this.data.form.maxCapacity) || 2;
    const nextCapacity = Math.max(2, Math.min(50, currentCapacity + step));
    this.setData({
      "form.maxCapacity": String(nextCapacity)
    });
  },

  /**
   * 选择并上传组局封面。
   */
  async handleCoverTap() {
    if (this.data.uploadingCover) {
      return;
    }

    try {
      const result = await wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        sizeType: ["compressed"]
      });
      const tempFilePath = result.tempFiles[0]?.tempFilePath;

      if (!tempFilePath) {
        return;
      }

      const previousCoverImage = this.data.coverImage;
      const previousCoverPreviewPath = this.data.coverPreviewPath;

      this.setData({
        coverPreviewPath: tempFilePath,
        uploadingCover: true
      });

      try {
        const coverImage = await uploadPartyCover(tempFilePath);
        this.setData({
          coverImage,
          coverPreviewPath: coverImage,
          uploadingCover: false
        });
        wx.showToast({
          title: "封面已上传",
          icon: "success"
        });
      } catch (error) {
        this.setData({
          coverImage: previousCoverImage,
          coverPreviewPath: previousCoverPreviewPath,
          uploadingCover: false
        });
        wx.showToast({
          title: "封面上传失败",
          icon: "none"
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("cancel")) {
        wx.showToast({
          title: "未选择图片",
          icon: "none"
        });
      }
    }
  },

  /**
   * 发布组局。
   */
  async handlePublish() {
    if (this.data.publishing) {
      return;
    }

    if (this.data.uploadingCover) {
      wx.showToast({
        title: "封面正在上传",
        icon: "none"
      });
      return;
    }

    const selectedTags =
      this.data.form.preference === "不限"
        ? this.data.selectedTags
        : [...this.data.selectedTags, this.data.form.preference];

    const draft = {
      title: this.data.form.title,
      venueId: this.data.venueId,
      venueSummary: this.data.venueSummary,
      startDate: this.data.form.date,
      startTime: this.data.form.startTime,
      durationMin: Number(this.data.form.duration),
      roomFee: Number(this.data.form.roomFee) * 100,
      maxCapacity: Number(this.data.form.maxCapacity),
      notes: this.data.form.notes,
      tags: selectedTags,
      coverImage: this.data.coverImage
    };
    const validation = validatePartyForm(draft);

    if (!validation.valid) {
      wx.showToast({
        title: validation.message,
        icon: "none"
      });
      return;
    }

    this.setData({ publishing: true });

    try {
      const createdParty = await createPartyDraft(draft);
      const publishedParty = await publishParty(createdParty.partyId);

      wx.showToast({
        title: "组局成功",
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
