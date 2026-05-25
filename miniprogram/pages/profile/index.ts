import { getFavoriteParties } from "../../services/api/favorite";
import { getMyPartyTabs } from "../../services/api/party";
import { getCurrentUser } from "../../services/api/user";
import { resolvePartyStatusTone } from "../../utils/party-status";
import type { Party } from "../../types/party";
import type { User } from "../../types/user";

type ProfileTabKey = "hosting" | "joined" | "favorites";

interface ProfileStat {
  label: string;
  value: string;
}

interface ProfileView {
  nickname: string;
  avatarUrl: string;
  intro: string;
  stats: ProfileStat[];
  tags: string[];
}

interface ProfileTab {
  key: ProfileTabKey;
  label: string;
  count: number;
}

interface ProfilePartyCard extends Party {
  displayTags: string[];
  statusTone: string;
}

interface ProfileTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      id?: string;
      key?: ProfileTabKey;
      label?: string;
    };
  };
}

type UserProfileFields = User & {
  intro?: string;
  tags?: string[];
};

const DEFAULT_CURRENT_USER_ID = "user-host";
const DEFAULT_PROFILE_AVATAR = "/assets/images/ktv/profile-avatar.svg";
const DEFAULT_PROFILE_INTRO = "记录深圳K歌兴趣活动";
const DEFAULT_PROFILE_NICKNAME = "微信用户";
const DEFAULT_PROFILE_TAGS = ["深圳", "K歌", "活动记录", "AA参考"];

const PROFILE_TAB_LABELS: Array<Omit<ProfileTab, "count">> = [
  { key: "hosting", label: "我发起的" },
  { key: "joined", label: "我加入的" },
  { key: "favorites", label: "我收藏的" }
];

Page({
  data: {
    profile: createProfileView(null, createEmptyProfilePartyGroups()),
    menu: [],
    profileCurrentTab: "hosting" as ProfileTabKey,
    profileEmptyDescription: "发布一条K歌活动信息，记录时间、地点和AA参考。",
    profileEmptyTitle: "还没有发布过活动",
    profileFavorites: [] as ProfilePartyCard[],
    profilePartyGroups: createEmptyProfilePartyGroups(),
    profilePartyList: [] as ProfilePartyCard[],
    profileTabs: createProfileTabs(createEmptyProfilePartyGroups())
  },

  /**
   * 页面展示时同步底部导航高亮。
   */
  async onShow() {
    this.getTabBar().setData({ selected: 3 });
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
   * 刷新我的资料、活动标签和列表。
   */
  async refreshProfileData() {
    const [currentUser, groupedParties, favoriteParties] = await Promise.all([
      getCurrentUser(DEFAULT_CURRENT_USER_ID),
      getMyPartyTabs(DEFAULT_CURRENT_USER_ID),
      getFavoriteParties()
    ]);
    const profilePartyGroups = {
      hosting: createProfilePartyCards(groupedParties.hosting),
      joined: createProfilePartyCards([...groupedParties.joined, ...groupedParties.waitlist]),
      favorites: createProfilePartyCards(favoriteParties)
    };
    const profileCurrentTab = this.data.profileCurrentTab;

    this.setData({
      profile: createProfileView(currentUser, profilePartyGroups),
      profileEmptyDescription: createProfileEmptyDescription(profileCurrentTab),
      profileEmptyTitle: createProfileEmptyTitle(profileCurrentTab),
      profileFavorites: profilePartyGroups.favorites,
      profilePartyGroups,
      profilePartyList: profilePartyGroups[profileCurrentTab],
      profileTabs: createProfileTabs(profilePartyGroups)
    });
  },

  /**
   * 切换我的页面组局标签。
   * @param event 点击事件
   */
  handleProfileTabTap(event: ProfileTapEvent) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.profileCurrentTab) {
      return;
    }

    this.setData({
      profileCurrentTab: key,
      profileEmptyDescription: createProfileEmptyDescription(key),
      profileEmptyTitle: createProfileEmptyTitle(key),
      profilePartyList: this.data.profilePartyGroups[key]
    });
  },

  /**
   * 打开我的页面活动详情。
   * @param event 点击事件
   */
  handleProfilePartyTap(event: ProfileTapEvent) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/party-detail/index?partyId=${id}`
    });
  },

  /**
   * 处理设置菜单点击。
   * @param event 点击事件
   */
  handleMenuTap(event: ProfileTapEvent) {
    const { label } = event.currentTarget.dataset;

    wx.showToast({
      title: `${label || "功能"}待开放`,
      icon: "none"
    });
  }
});

/**
 * 创建空的组局分组。
 * @returns 空分组结构
 */
function createEmptyProfilePartyGroups(): Record<ProfileTabKey, ProfilePartyCard[]> {
  return {
    hosting: [],
    joined: [],
    favorites: []
  };
}

/**
 * 创建我的页面名片资料。
 * @param currentUser 当前用户资料
 * @param groups 当前用户活动分组
 * @returns 我的页面名片资料
 */
function createProfileView(
  currentUser: User | null,
  groups: Record<ProfileTabKey, ProfilePartyCard[]>
): ProfileView {
  const userProfile = currentUser as UserProfileFields | null;
  const nickname = currentUser ? currentUser.nickname : "";
  const avatarUrl = currentUser ? currentUser.avatarUrl : "";
  const tags = userProfile?.tags?.length ? userProfile.tags : DEFAULT_PROFILE_TAGS;

  return {
    nickname: nickname || DEFAULT_PROFILE_NICKNAME,
    avatarUrl: avatarUrl || DEFAULT_PROFILE_AVATAR,
    intro: userProfile?.intro || DEFAULT_PROFILE_INTRO,
    stats: createProfileStats(groups),
    tags: tags.slice(0, 4)
  };
}

/**
 * 创建我的页面真实活动统计。
 * @param groups 当前用户活动分组
 * @returns 统计展示数据
 */
function createProfileStats(groups: Record<ProfileTabKey, ProfilePartyCard[]>): ProfileStat[] {
  return [
    { label: "发布活动", value: String(groups.hosting.length) },
    { label: "参与次数", value: String(groups.joined.length) },
    { label: "收藏", value: String(groups.favorites.length) }
  ];
}

/**
 * 创建我的页面标签配置。
 * @param groups 组局分组数据
 * @returns 标签配置
 */
function createProfileTabs(groups: Record<ProfileTabKey, ProfilePartyCard[]>): ProfileTab[] {
  return PROFILE_TAB_LABELS.map((item) => ({
    ...item,
    count: groups[item.key].length
  }));
}

/**
 * 创建我的页面组局卡片数据。
 * @param parties 组局数据
 * @returns 可展示卡片数据
 */
function createProfilePartyCards(parties: Party[]): ProfilePartyCard[] {
  return parties.map((party) => ({
    ...party,
    displayTags: party.tags.slice(0, 3),
    statusTone: resolvePartyStatusTone(party.status, party.statusText)
  }));
}

/**
 * 创建空列表标题。
 * @param tabKey 当前标签
 * @returns 空列表标题
 */
function createProfileEmptyTitle(tabKey: ProfileTabKey): string {
  const titleMap: Record<ProfileTabKey, string> = {
    hosting: "还没有发布过活动",
    joined: "还没有报名过活动",
    favorites: "还没有收藏过活动"
  };

  return titleMap[tabKey];
}

/**
 * 创建空列表描述。
 * @param tabKey 当前标签
 * @returns 空列表描述
 */
function createProfileEmptyDescription(tabKey: ProfileTabKey): string {
  const descriptionMap: Record<ProfileTabKey, string> = {
    hosting: "发布一条K歌活动信息，记录时间、地点和AA参考。",
    joined: "报名成功后，活动记录会出现在这里。",
    favorites: "收藏感兴趣的活动，之后可以快速回看。"
  };

  return descriptionMap[tabKey];
}
