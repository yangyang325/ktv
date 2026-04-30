interface LaunchForm {
  title: string;
  timeText: string;
  venueText: string;
  roomType: string;
  minPeople: number;
  maxPeople: number;
  preference: string;
  notes: string;
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
      step?: number;
    };
  };
}

Page({
  data: {
    form: {
      title: "",
      timeText: "选择日期与时间",
      venueText: "选择KTV",
      roomType: "aa",
      minPeople: 4,
      maxPeople: 10,
      preference: "不限",
      notes: ""
    } as LaunchForm,
    titleLength: 0,
    notesLength: 0,
    tags: ["流行", "粤语", "经典老歌", "90后", "80后", "友好局", "麦霸局", "气氛好"],
    selectedTags: ["流行", "粤语", "经典老歌", "90后", "80后", "友好局", "麦霸局", "气氛好"],
    roomTypes: [
      { label: "AA制", value: "aa" },
      { label: "我请客", value: "treat" }
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
   * 切换属性标签。
   * @param event 点击事件
   */
  handleTagTap(event: TagTapEvent) {
    const tag = event.currentTarget.dataset.tag;
    if (!tag) {
      return;
    }

    const selectedTags = this.data.selectedTags.includes(tag)
      ? this.data.selectedTags.filter((item) => item !== tag)
      : [...this.data.selectedTags, tag];
    this.setData({ selectedTags });
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
    if (!field || typeof step !== "number") {
      return;
    }

    const current = this.data.form[field];
    const next = Math.max(1, Math.min(20, current + step));
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

});
