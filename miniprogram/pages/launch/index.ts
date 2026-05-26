import { createPartyDraft, publishParty } from "../../services/api/party";
import { uploadPartyCover } from "../../services/api/upload";
import { buildActivityTimeText, getTodayDate } from "../../utils/date";
import { parseDurationHourToMinutes } from "../../utils/format";
import { ensureLoggedInForAction } from "../../utils/auth";
import { validatePartyForm } from "../../utils/validators";

interface LaunchForm {
  title: string;
  venueId: string;
  date: string;
  startTime: string;
  timeText: string;
  venueText: string;
  venueAddress: string;
  venueLatitude?: number;
  venueLongitude?: number;
  roomType: string;
  minPeople: number;
  maxPeople: number;
  durationHour: string;
  roomFee: string;
  preference: string;
  notes: string;
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

interface PartyTagOption {
  name: string;
  selected: boolean;
}

interface FieldChangeEvent extends WechatMiniprogram.Input {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      field?: keyof LaunchForm;
    };
  };
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

interface RoomTypeTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      value?: string;
    };
  };
}

interface PeopleStepEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      field?: "minPeople" | "maxPeople";
      step?: number | string;
    };
  };
}

Page({
  data: {
    form: {
      title: "",
      venueId: "",
      date: "",
      startTime: "",
      timeText: "选择日期与时间",
      venueText: "选择活动地点",
      venueAddress: "",
      venueLatitude: undefined,
      venueLongitude: undefined,
      roomType: "aa",
      minPeople: 4,
      maxPeople: 10,
      durationHour: "",
      roomFee: "",
      preference: "不限",
      notes: ""
    } as LaunchForm,
    coverImage: "",
    coverPreviewPath: "",
    uploadingCover: false,
    publishing: false,
    todayDate: getTodayDate(),
    preferenceIndex: 0,
    preferenceOptions: ["不限", "流行", "粤语", "经典老歌", "合唱友好", "轻松听歌"],
    titleLength: 0,
    notesLength: 0,
    tags: ["流行", "粤语", "经典老歌", "怀旧金曲", "当下流行", "新手友好", "轮流唱", "轻松氛围"].map((name) => ({
      name,
      selected: false
    })) as PartyTagOption[],
    selectedTags: [] as string[],
    roomTypes: [
      { label: "AA参考", value: "aa" },
      { label: "线下自理", value: "self" }
    ]
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
   * 更新表单字段。
   * @param event 输入事件
   */
  handleFieldChange(event: FieldChangeEvent) {
    const field = event.currentTarget.dataset.field;
    if (!field) {
      return;
    }

    const value = event.detail.value;
    this.setData({
      [`form.${field}`]: value,
      titleLength: field === "title" ? value.length : this.data.titleLength,
      notesLength: field === "notes" ? value.length : this.data.notesLength
    });
  },

  /**
   * 选择 KTV 场所位置。
   */
  async handleVenueLocationTap() {
    try {
      const location = await wx.chooseLocation({});
      const venueText = formatChosenVenueSummary(location);

      if (!venueText) {
        wx.showToast({
          title: "请选择活动地点",
          icon: "none"
        });
        return;
      }

      this.setData({
        "form.venueId": "custom-location",
        "form.venueText": venueText,
        "form.venueAddress": location.address || venueText,
        "form.venueLatitude": location.latitude,
        "form.venueLongitude": location.longitude
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("cancel")) {
        wx.showToast({
          title: "未选择活动地点",
          icon: "none"
        });
      }
    }
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
   * 切换属性标签。
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
    const date = event.detail.value;
    this.setData({
      "form.date": date,
      "form.timeText": buildActivityTimeText(date, this.data.form.startTime)
    });
  },

  /**
   * 更新活动开始时间。
   * @param event 时间选择事件
   */
  handleStartTimeChange(event: PickerChangeEvent) {
    const startTime = event.detail.value;
    this.setData({
      "form.startTime": startTime,
      "form.timeText": buildActivityTimeText(this.data.form.date, startTime)
    });
  },

  /**
   * 更新曲风偏好。
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
   * 切换房间类型。
   * @param event 点击事件
   */
  handleRoomTypeTap(event: RoomTypeTapEvent) {
    const value = event.currentTarget.dataset.value;
    if (!value) {
      return;
    }

    this.setData({
      "form.roomType": value
    });
  },

  /**
   * 调整预计人数。
   * @param event 点击事件
   */
  handlePeopleStep(event: PeopleStepEvent) {
    const { field, step } = event.currentTarget.dataset;
    const stepValue = Number(step);
    if (!field || !Number.isFinite(stepValue)) {
      return;
    }

    const current = this.data.form[field];
    const next = Math.max(1, Math.min(20, current + stepValue));
    if (field === "minPeople" && next > this.data.form.maxPeople) {
      return;
    }

    if (field === "maxPeople" && next < this.data.form.minPeople) {
      return;
    }

    this.setData({
      [`form.${field}`]: next
    });
  },

  /**
   * 提交首页发布活动表单并直接发布。
   */
  async handleSubmit() {
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

    const hasLoggedIn = await ensureLoggedInForAction("发布活动");
    if (!hasLoggedIn) {
      return;
    }

    const selectedTags =
      this.data.form.preference === "不限"
        ? this.data.selectedTags
        : [...this.data.selectedTags, this.data.form.preference];
    const draft = {
      title: this.data.form.title,
      venueId: this.data.form.venueId,
      venueSummary: this.data.form.venueText,
      venueAddress: this.data.form.venueAddress,
      venueLatitude: this.data.form.venueLatitude,
      venueLongitude: this.data.form.venueLongitude,
      startDate: this.data.form.date,
      startTime: this.data.form.startTime,
      durationMin: parseDurationHourToMinutes(this.data.form.durationHour),
      roomFee: Number(this.data.form.roomFee) * 100,
      maxCapacity: this.data.form.maxPeople,
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
        title: "活动已发布",
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
  },

});
