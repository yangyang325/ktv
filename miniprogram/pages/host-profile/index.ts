import { DEFAULT_PROFILE_AVATAR_IMAGES } from "../../constants/assets";
import { ROUTES } from "../../constants/routes";
import { isUserFollowing, toggleUserFollow } from "../../services/api/follow";
import { getPublicUserProfile, getUserById } from "../../services/api/user";
import type { Party } from "../../types/party";
import type { PublicUserProfile, User } from "../../types/user";
import { ensureLoggedInForAction } from "../../utils/auth";
import { createSubmitGuard } from "../../utils/submit-guard";

type HostTagTone = "purple" | "blue" | "green" | "pink";
type HostProfileTag = {
  label: string;
  tone: HostTagTone;
};
type HostProfileStat = {
  label: string;
  value: string;
  iconUrl: string;
};
type HostProfileView = {
  user: User;
  tags: HostProfileTag[];
  introText: string;
  stats: HostProfileStat[];
  recentParty: Party | null;
};

const HOST_TAG_TONES: HostTagTone[] = ["purple", "blue", "green", "pink"];
const runHostProfileFollowSubmit = createSubmitGuard();

interface RecentPartyTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      partyId?: string;
    };
  };
}

Page({
  data: {
    userId: "",
    loading: true,
    profile: null as HostProfileView | null,
    canFollowUser: false,
    isFollowingUser: false,
    followSubmitting: false,
    defaultAvatarUrl: DEFAULT_PROFILE_AVATAR_IMAGES[0]
  },

  /**
   * 读取发起者资料页参数并加载资料。
   * @param options 路由参数
   */
  async onLoad(options: Record<string, string>) {
    const userId = options.userId || "";
    if (!userId) {
      this.setData({ loading: false });
      wx.showToast({
        title: "缺少发起者信息",
        icon: "none"
      });
      return;
    }

    this.setData({ userId });
    await this.loadProfile(userId);
  },

  /**
   * 加载发起者公开资料。
   * @param userId 用户 ID
   */
  async loadProfile(userId: string) {
    this.setData({ loading: true });
    try {
      const publicProfile = await getPublicUserProfile(userId);
      this.setData({
        profile: createHostProfileView(publicProfile),
        loading: false
      });
      void this.refreshFollowState(userId);
    } catch {
      this.setData({
        profile: null,
        canFollowUser: false,
        isFollowingUser: false,
        loading: false
      });
      wx.showToast({
        title: "资料读取失败",
        icon: "none"
      });
    }
  },

  /**
   * 刷新发起者关注状态，未登录用户保留关注入口用于引导登录。
   * @param userId 发起者用户 ID
   */
  async refreshFollowState(userId: string) {
    if (!userId) {
      this.setData({
        canFollowUser: false,
        isFollowingUser: false
      });
      return;
    }

    let canFollowUser = true;
    try {
      const currentUser = await getUserById();
      canFollowUser = !currentUser || currentUser.userId !== userId;
    } catch {
      canFollowUser = true;
    }

    if (!canFollowUser) {
      this.setData({
        canFollowUser: false,
        isFollowingUser: false
      });
      return;
    }

    try {
      const isFollowingUser = await isUserFollowing(userId);
      this.setData({
        canFollowUser: true,
        isFollowingUser
      });
    } catch {
      this.setData({
        canFollowUser: true,
        isFollowingUser: false
      });
    }
  },

  /**
   * 切换对发起者的关注状态。
   */
  async handleFollowTap() {
    const targetUserId = this.data.userId;
    if (!targetUserId || !this.data.canFollowUser) {
      return;
    }

    const hasLoggedIn = await ensureLoggedInForAction("关注用户");
    if (!hasLoggedIn) {
      return;
    }

    await runHostProfileFollowSubmit.run(async () => {
      if (this.data.followSubmitting) {
        return;
      }

      this.setData({ followSubmitting: true });
      try {
        const isFollowingUser = await toggleUserFollow(targetUserId);
        this.setData({ isFollowingUser });
        wx.showToast({
          title: isFollowingUser ? "已关注" : "已取消关注",
          icon: "none"
        });
      } catch (error) {
        wx.showToast({
          title: error instanceof Error ? error.message : "关注失败，请稍后再试",
          icon: "none"
        });
      } finally {
        this.setData({ followSubmitting: false });
      }
    });
  },

  /**
   * 打开最近发起活动详情。
   * @param event 点击事件
   */
  handleRecentPartyTap(event: RecentPartyTapEvent) {
    const partyId = event.currentTarget.dataset.partyId || "";
    if (!partyId) {
      return;
    }

    wx.navigateTo({
      url: `${ROUTES.partyDetail}?partyId=${partyId}`
    });
  }
});

/**
 * 创建发起者资料页面视图。
 * @param publicProfile 云端公开资料
 * @returns 页面展示资料
 */
function createHostProfileView(publicProfile: PublicUserProfile): HostProfileView {
  return {
    user: publicProfile.user,
    tags: createHostProfileTags(publicProfile.user.tags),
    introText: createHostProfileIntro(publicProfile.user.intro),
    stats: createHostProfileStats(publicProfile.stats.hostingCount, publicProfile.stats.successfulCount),
    recentParty: publicProfile.recentParty || null
  };
}

/**
 * 创建发起者标签展示。
 * @param tags 云端用户标签
 * @returns 标签展示列表
 */
function createHostProfileTags(tags?: string[]): HostProfileTag[] {
  const profileTags = Array.isArray(tags) ? tags.filter(Boolean).slice(0, 4) : [];
  return profileTags.map((label, index) => ({
    label,
    tone: HOST_TAG_TONES[index % HOST_TAG_TONES.length]
  }));
}

/**
 * 创建发起者简介展示文案。
 * @param intro 云端简介
 * @returns 简介文案
 */
function createHostProfileIntro(intro?: string) {
  return intro?.trim() || "喜欢K歌兴趣活动，活动信息由发起人自行维护。";
}

/**
 * 创建发起者组局统计展示。
 * @param hostingCount 发起活动次数
 * @param successfulCount 成功成团次数
 * @returns 统计展示列表
 */
function createHostProfileStats(hostingCount: number, successfulCount: number): HostProfileStat[] {
  return [
    {
      label: "发起活动",
      value: String(hostingCount),
      iconUrl: "/assets/images/ktv/host-profile-stat-launch.svg"
    },
    {
      label: "成功成团",
      value: String(successfulCount),
      iconUrl: "/assets/images/ktv/host-profile-stat-success.svg"
    }
  ];
}
