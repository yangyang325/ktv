import { DEFAULT_PROFILE_AVATAR_IMAGES } from "../../constants/assets";
import { ROUTES } from "../../constants/routes";
import { getFavoriteParties } from "../../services/api/favorite";
import { getFollowStats } from "../../services/api/follow";
import { getMyPartyTabs } from "../../services/api/party";
import { getCurrentUserWithWechatProfile } from "../../services/api/user";
import type { User } from "../../types/user";
import { createProfileAchievements, type ProfileAchievement } from "../../utils/profile-achievements";

interface ProfileStat {
  label: string;
  value: string;
  target?: ProfileStatTarget;
}

interface ProfileView {
  nickname: string;
  avatarUrl: string;
  gender: string;
  genderIconUrl: string;
  genderTone: ProfileGenderTone;
  intro: string;
  userTags: ProfileTagView[];
  stats: ProfileStat[];
  achievements: ProfileAchievement[];
}

interface ProfileTagView {
  label: string;
  tone: ProfileTagTone;
}

type ProfileFields = Omit<ProfileView, "stats" | "achievements">;
type ProfileGenderTone = "female" | "male" | "secret";
type ProfileStatTarget = "myParties" | "favorites";
type ProfileTagTone = "purple" | "blue" | "green" | "orange" | "pink";

interface ProfileCounts {
  hosting: number;
  joined: number;
  favorites: number;
  followers: number;
}

interface ProfileMenuItem {
  key: "contact";
  label: string;
  desc: string;
  iconUrl: string;
  contact: string;
  actionText: string;
}

interface ProfileTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      contact?: string;
      label?: string;
      target?: ProfileStatTarget;
    };
  };
}

type UserProfileFields = User & {
  intro?: string;
  tags?: string[];
};

const DEFAULT_PROFILE_AVATAR = DEFAULT_PROFILE_AVATAR_IMAGES[0];
const DEFAULT_PROFILE_INTRO = "记录深圳K歌兴趣活动";
const DEFAULT_PROFILE_GENDER = "保密";
const DEFAULT_PROFILE_NICKNAME = "微信用户";
const PROFILE_GENDER_ICON_URLS: Record<ProfileGenderTone, string> = {
  female: "/assets/images/ktv/gender-female.svg",
  male: "/assets/images/ktv/gender-male.svg",
  secret: "/assets/images/ktv/gender-secret.svg"
};
const PROFILE_CONTACT_WECHAT = "Hammy_Y";
const PROFILE_TAG_TONES: ProfileTagTone[] = ["purple", "blue", "purple", "orange", "green", "pink"];
const PROFILE_MENU: ProfileMenuItem[] = [
  {
    key: "contact",
    label: "联系我们",
    desc: `微信：${PROFILE_CONTACT_WECHAT}`,
    iconUrl: "/assets/images/ktv/profile-menu-service.svg",
    contact: PROFILE_CONTACT_WECHAT,
    actionText: "复制"
  }
];

Page({
  data: {
    profile: createProfileView(null, createEmptyProfileCounts()),
    menu: PROFILE_MENU
  },

  /**
   * 页面展示时同步底部导航高亮。
   */
  async onShow() {
    this.getTabBar().setData({ selected: 2 });
    await this.refreshProfileData();
  },

  /**
   * 打开编辑资料入口。
   */
  handleEditProfile() {
    wx.navigateTo({
      url: "/pages/profile-edit/index"
    });
  },

  /**
   * 打开编辑标签入口。
   */
  handleEditTags() {
    wx.navigateTo({
      url: "/pages/profile-tags/index"
    });
  },

  /**
   * 打开全部成就页面。
   */
  handleViewAchievements() {
    wx.navigateTo({
      url: "/pages/profile-achievements/index"
    });
  },

  /**
   * 处理我的页统计项点击。
   * @param event 点击事件
   */
  handleStatTap(event: ProfileTapEvent) {
    const { target } = event.currentTarget.dataset;

    if (target === "myParties") {
      wx.navigateTo({
        url: ROUTES.myParties
      });
      return;
    }

    if (target === "favorites") {
      wx.navigateTo({
        url: ROUTES.favorites
      });
    }
  },

  /**
   * 刷新我的资料和真实活动统计。
   */
  async refreshProfileData() {
    const [currentUser, groupedParties, favoriteParties, followStats] = await Promise.all([
      getCurrentUserWithWechatProfile(),
      getMyPartyTabs(),
      getFavoriteParties(),
      getFollowStats()
    ]);
    const profileCounts: ProfileCounts = {
      hosting: groupedParties.hosting.length,
      joined: groupedParties.joined.length + groupedParties.waitlist.length,
      favorites: favoriteParties.length,
      followers: followStats.followerCount
    };

    this.setData({
      profile: createProfileView(currentUser, profileCounts)
    });
  },

  /**
   * 使用编辑页刚保存的云端资料即时更新我的页名片。
   * @param currentUser 最新用户资料
   */
  applyUpdatedProfile(currentUser: User) {
    const profileFields = createProfileFields(currentUser);

    this.setData({
      "profile.nickname": profileFields.nickname,
      "profile.avatarUrl": profileFields.avatarUrl,
      "profile.gender": profileFields.gender,
      "profile.genderIconUrl": profileFields.genderIconUrl,
      "profile.genderTone": profileFields.genderTone,
      "profile.intro": profileFields.intro,
      "profile.userTags": profileFields.userTags
    });
  },

  /**
   * 处理设置菜单点击。
   * @param event 点击事件
   */
  handleMenuTap(event: ProfileTapEvent) {
    const { contact, label } = event.currentTarget.dataset;

    if (contact) {
      wx.setClipboardData({
        data: contact
      });
      wx.showToast({
        title: "微信号已复制",
        icon: "success"
      });
      return;
    }

    wx.showToast({
      title: `${label || "功能"}待开放`,
      icon: "none"
    });
  },

  /**
   * 构建我的页分享给朋友的卡片信息。
   * @returns 分享配置
   */
  onShareAppMessage() {
    return {
      title: "深圳K歌兴趣活动工具",
      path: "/pages/profile/index"
    };
  },

  /**
   * 构建我的页分享到朋友圈的信息。
   * @returns 分享配置
   */
  onShareTimeline() {
    return {
      title: "深圳K歌兴趣活动工具",
      query: ""
    };
  }
});

/**
 * 创建空的我的页活动统计。
 * @returns 空统计结构
 */
function createEmptyProfileCounts(): ProfileCounts {
  return {
    hosting: 0,
    joined: 0,
    favorites: 0,
    followers: 0
  };
}

/**
 * 创建我的页面名片资料。
 * @param currentUser 当前用户资料
 * @param counts 当前用户活动统计
 * @returns 我的页面名片资料
 */
function createProfileView(
  currentUser: User | null,
  counts: ProfileCounts
): ProfileView {
  return {
    ...createProfileFields(currentUser),
    stats: createProfileStats(counts),
    achievements: createProfileAchievements(counts).slice(0, 4)
  };
}

/**
 * 创建我的页面名片基础资料。
 * @param currentUser 当前用户资料
 * @returns 名片基础资料
 */
function createProfileFields(currentUser: User | null): ProfileFields {
  const userProfile = currentUser as UserProfileFields | null;
  const nickname = currentUser ? currentUser.nickname : "";
  const avatarUrl = currentUser ? currentUser.avatarUrl : "";
  const gender = userProfile?.gender || DEFAULT_PROFILE_GENDER;

  return {
    nickname: nickname || DEFAULT_PROFILE_NICKNAME,
    avatarUrl: DEFAULT_PROFILE_AVATAR_IMAGES.includes(avatarUrl as typeof DEFAULT_PROFILE_AVATAR_IMAGES[number])
      ? avatarUrl
      : DEFAULT_PROFILE_AVATAR,
    gender,
    genderIconUrl: createGenderIconUrl(gender),
    genderTone: createGenderTone(gender),
    intro: userProfile?.intro || DEFAULT_PROFILE_INTRO,
    userTags: createProfileTags(userProfile?.tags)
  };
}

/**
 * 创建我的页面标签展示。
 * @param tags 云端保存的用户标签
 * @returns 标签展示列表
 */
function createProfileTags(tags: string[] | undefined): ProfileTagView[] {
  return (tags || []).slice(0, 6).map((label, index) => ({
    label,
    tone: PROFILE_TAG_TONES[index % PROFILE_TAG_TONES.length]
  }));
}

/**
 * 根据用户性别生成我的页性别 SVG 图标地址。
 * @param gender 用户资料里的性别文本
 * @returns 性别 SVG 图标地址
 */
function createGenderIconUrl(gender: string): string {
  return PROFILE_GENDER_ICON_URLS[createGenderTone(gender)];
}

/**
 * 根据用户性别生成我的页性别样式状态。
 * @param gender 用户资料里的性别文本
 * @returns 性别样式状态
 */
function createGenderTone(gender: string): ProfileGenderTone {
  if (gender === "女") {
    return "female";
  }

  if (gender === "男") {
    return "male";
  }

  return "secret";
}

/**
 * 创建我的页面真实活动统计。
 * @param counts 当前用户活动统计
 * @returns 统计展示数据
 */
function createProfileStats(counts: ProfileCounts): ProfileStat[] {
  return [
    { label: "发布活动", value: String(counts.hosting), target: "myParties" },
    { label: "参与次数", value: String(counts.joined) },
    { label: "收藏", value: String(counts.favorites), target: "favorites" },
    { label: "粉丝", value: String(counts.followers) }
  ];
}
