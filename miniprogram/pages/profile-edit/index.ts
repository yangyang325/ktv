import { DEFAULT_CITY_NAME } from "../../constants/location";

interface ProfileForm {
  avatarUrl: string;
  nickname: string;
  gender: string;
  ktvId: string;
  intro: string;
  city: string;
  birthday: string;
  wechatId: string;
  phone: string;
}

interface FieldInputEvent extends WechatMiniprogram.Input {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      field?: keyof ProfileForm;
    };
  };
}

interface PickerChangeEvent extends WechatMiniprogram.BaseEvent {
  detail: {
    value: number | string;
  };
}

Page({
  data: {
    genderOptions: ["女", "男", "保密"],
    genderIndex: 0,
    form: {
      avatarUrl: "/assets/images/ktv/profile-avatar.svg",
      nickname: "小麦麦",
      gender: "女",
      ktvId: "888888",
      intro: "喜欢唱歌，性格开朗好相处～",
      city: DEFAULT_CITY_NAME,
      birthday: "1995-06-18",
      wechatId: "",
      phone: ""
    } as ProfileForm
  },

  /**
   * 页面加载时读取本地资料。
   */
  onLoad() {
    const savedProfile = wx.getStorageSync("profileEditForm") as Partial<ProfileForm> | undefined;
    const form = {
      ...this.data.form,
      ...(savedProfile || {})
    };

    this.setData({
      form,
      genderIndex: Math.max(0, this.data.genderOptions.indexOf(form.gender))
    });
  },

  /**
   * 选择头像图片。
   */
  async handleChooseAvatar() {
    try {
      const result = await wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        sizeType: ["compressed"]
      });
      const tempFilePath = result.tempFiles[0]?.tempFilePath;

      if (tempFilePath) {
        this.setData({
          "form.avatarUrl": tempFilePath
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("cancel")) {
        wx.showToast({
          title: "未选择头像",
          icon: "none"
        });
      }
    }
  },

  /**
   * 更新文本资料字段。
   * @param event 输入事件
   */
  handleFieldInput(event: FieldInputEvent) {
    const field = event.currentTarget.dataset.field;
    if (!field) {
      return;
    }

    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  /**
   * 更新性别。
   * @param event 选择器事件
   */
  handleGenderChange(event: PickerChangeEvent) {
    const genderIndex = Number(event.detail.value);
    const gender = this.data.genderOptions[genderIndex];
    if (!gender) {
      return;
    }

    this.setData({
      genderIndex,
      "form.gender": gender
    });
  },

  /**
   * 更新生日。
   * @param event 日期选择事件
   */
  handleBirthdayChange(event: WechatMiniprogram.BaseEvent & { detail: { value: string } }) {
    this.setData({
      "form.birthday": event.detail.value
    });
  },

  /**
   * 复制 K 歌号。
   */
  handleCopyKtvId() {
    wx.setClipboardData({
      data: this.data.form.ktvId
    });
  },

  /**
   * 保存编辑资料。
   */
  handleSave() {
    wx.setStorageSync("profileEditForm", this.data.form);
    wx.showToast({
      title: "保存成功",
      icon: "success"
    });
  }
});
