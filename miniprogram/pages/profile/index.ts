import { getMyPartyTabs } from "../../services/api/party";
import type { Party } from "../../types/party";

type ProfileTabKey = "hosting" | "joined" | "favorites";

interface ProfileTab {
  key: ProfileTabKey;
  label: string;
  count: number;
}

interface ProfilePartyCard extends Party {
  displayTags: string[];
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

const PROFILE_TAB_LABELS: Array<Omit<ProfileTab, "count">> = [
  { key: "hosting", label: "我发起的" },
  { key: "joined", label: "我加入的" },
  { key: "favorites", label: "我收藏的" }
];

Page({
  data: {
    profile: {
      nickname: "小麦麦",
      avatarUrl: "/assets/images/ktv/profile-avatar.svg",
      intro: "K歌，只因遇到好的朋友 🎤",
      stats: [
        { label: "发起组局", value: "12" },
        { label: "参与次数", value: "28" },
        { label: "收藏", value: "36" }
      ],
      tags: ["求玩", "爱唱歌", "找同伴", "现场控"]
    },
    menu: [],
    profileCurrentTab: "hosting" as ProfileTabKey,
    profileEmptyDescription: "发起一个 KTV 局，找到同频朋友一起唱。",
    profileEmptyTitle: "还没有发布过组局",
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
    await this.refreshProfileParties();
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
   * 刷新我的组局标签和列表。
   */
  async refreshProfileParties() {
    const groupedParties = await getMyPartyTabs("user-host");
    const profileFavorites = this.data.profileFavorites;
    const profilePartyGroups = {
      hosting: createProfilePartyCards(groupedParties.hosting),
      joined: createProfilePartyCards([...groupedParties.joined, ...groupedParties.waitlist]),
      favorites: profileFavorites
    };
    const profileCurrentTab = this.data.profileCurrentTab;

    this.setData({
      profileEmptyDescription: createProfileEmptyDescription(profileCurrentTab),
      profileEmptyTitle: createProfileEmptyTitle(profileCurrentTab),
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
   * 打开我的页面组局详情。
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
    displayTags: party.tags.slice(0, 3)
  }));
}

/**
 * 创建空列表标题。
 * @param tabKey 当前标签
 * @returns 空列表标题
 */
function createProfileEmptyTitle(tabKey: ProfileTabKey): string {
  const titleMap: Record<ProfileTabKey, string> = {
    hosting: "还没有发布过组局",
    joined: "还没有加入过组局",
    favorites: "还没有收藏过组局"
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
    hosting: "发起一个 KTV 局，找到同频朋友一起唱。",
    joined: "遇到喜欢的局就报名，行程会出现在这里。",
    favorites: "收藏感兴趣的组局，之后可以快速回看。"
  };

  return descriptionMap[tabKey];
}
