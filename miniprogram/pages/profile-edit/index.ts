import { DEFAULT_PROFILE_AVATAR_IMAGES, selectRandomProfileAvatarImage } from "../../constants/assets";
import { getCurrentUser, updateCurrentUser } from "../../services/api/user";
import type { User } from "../../types/user";

interface ProfileForm {
  avatarUrl: string;
  nickname: string;
  gender: string;
  intro: string;
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

interface AvatarSelectEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      avatar?: string;
    };
  };
}

type ProfileEditUser = User & {
  intro?: string;
};

Page({
  data: {
    avatarOptions: DEFAULT_PROFILE_AVATAR_IMAGES,
    genderOptions: ["女", "男", "保密"],
    genderIndex: 0,
    form: {
      avatarUrl: DEFAULT_PROFILE_AVATAR_IMAGES[0],
      nickname: "微信用户",
      gender: "保密",
      intro: "记录深圳K歌兴趣活动"
    } as ProfileForm
  },

  /**
   * 页面加载时读取云端资料。
   */
  async onLoad() {
    let currentUser: User | null = null;

    try {
      currentUser = await getCurrentUser();
    } catch {
      currentUser = null;
    }

    const form = createProfileForm(this.data.form, currentUser);

    this.setData({
      form,
      genderIndex: Math.max(0, this.data.genderOptions.indexOf(form.gender))
    });
  },

  /**
   * 选择默认头像。
   * @param event 点击事件
   */
  handleAvatarSelect(event: AvatarSelectEvent) {
    const avatarUrl = event.currentTarget.dataset.avatar;
    if (!avatarUrl || avatarUrl === this.data.form.avatarUrl) {
      return;
    }

    this.setData({
      "form.avatarUrl": avatarUrl
    });
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
   * 保存编辑资料。
   */
  async handleSave() {
    try {
      const updatedUser = await updateCurrentUser(this.data.form);
      notifyPreviousProfilePage(updatedUser);
      wx.showToast({
        title: "保存成功",
        icon: "success"
      });
      wx.navigateBack({
        delta: 1
      });
    } catch {
      wx.showToast({
        title: "保存失败，请稍后再试",
        icon: "none"
      });
    }
  }
});

/**
 * 通知上一页即时更新资料展示。
 * @param updatedUser 云端保存后的用户资料
 */
function notifyPreviousProfilePage(updatedUser: User) {
  const pages = getCurrentPages();
  const previousPage = pages[pages.length - 2] as
    | {
        applyUpdatedProfile?: (currentUser: User) => void;
        refreshProfileData?: () => Promise<void>;
      }
    | undefined;

  if (previousPage?.applyUpdatedProfile) {
    previousPage.applyUpdatedProfile(updatedUser);
  }

  if (previousPage?.refreshProfileData) {
    void previousPage.refreshProfileData();
  }
}

/**
 * 创建编辑资料表单。
 * @param defaultForm 默认表单
 * @param currentUser 当前用户
 * @returns 编辑资料表单
 */
function createProfileForm(
  defaultForm: ProfileForm,
  currentUser: User | null
): ProfileForm {
  const profileUser = currentUser as ProfileEditUser | null;

  return {
    ...defaultForm,
    ...(currentUser
      ? {
          avatarUrl: DEFAULT_PROFILE_AVATAR_IMAGES.includes(currentUser.avatarUrl as typeof DEFAULT_PROFILE_AVATAR_IMAGES[number])
            ? currentUser.avatarUrl
            : selectRandomProfileAvatarImage(),
          nickname: currentUser.nickname || defaultForm.nickname,
          gender: profileUser?.gender || defaultForm.gender,
          intro: profileUser?.intro || defaultForm.intro
        }
      : {})
  };
}
