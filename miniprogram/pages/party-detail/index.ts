import { ROUTES } from "../../constants/routes";
import { DEFAULT_PROFILE_AVATAR_IMAGES } from "../../constants/assets";
import { isPartyFavorited, togglePartyFavorite } from "../../services/api/favorite";
import { isUserFollowing, toggleUserFollow } from "../../services/api/follow";
import { getPartyDetail, quitParty, togglePartyStatus } from "../../services/api/party";
import type { PartyStatus } from "../../types/common";
import { ensureLoggedInForAction } from "../../utils/auth";
import { resolvePartyStatusTone } from "../../utils/party-status";
import { createSubmitGuard } from "../../utils/submit-guard";

type PartyDetail = Awaited<ReturnType<typeof getPartyDetail>>;
type DisplayTag = {
  label: string;
};

const runFavoriteSubmit = createSubmitGuard();
const runFollowSubmit = createSubmitGuard();
const runWaitlistSubmit = createSubmitGuard();
const runStatusSwitchSubmit = createSubmitGuard();
const runQuitPartySubmit = createSubmitGuard();

Page({
  data: {
    partyId: "",
    detail: null as PartyDetail | null,
    confirmedUsers: [] as string[],
    waitlistUsers: [] as string[],
    canViewContacts: false,
    displayTags: [] as DisplayTag[],
    remainingCount: 0,
    isFavorited: false,
    statusTone: "signup",
    canSwitchPartyStatus: false,
    statusSwitchText: "",
    statusSwitchTarget: "" as Extract<PartyStatus, "recruiting" | "finished"> | "",
    isFollowingHost: false,
    canFollowHost: false,
    canQuitParty: false,
    canWaitlistParty: false,
    durationHourText: "3",
    defaultHostAvatarUrl: DEFAULT_PROFILE_AVATAR_IMAGES[0],
    favoriteSubmitting: false,
    followSubmitting: false,
    waitlistSubmitting: false,
    statusSwitchSubmitting: false,
    quitSubmitting: false,
    statusBarHeight: 0
  },

  /**
   * 读取局详情路由参数并初始化自定义导航。
   */
  async onLoad(options: Record<string, string>) {
    this.setupNavigation();

    const partyId = options.partyId || "";
    if (!partyId) {
      wx.showToast({
        title: "缺少活动信息",
        icon: "none"
      });
      return;
    }

    this.setData({ partyId });
    await this.refreshDetail();
  },

  /**
   * 页面回到前台时刷新报名人数。
   */
  onShow() {
    if (!this.data.partyId || !this.data.detail) {
      return;
    }

    void this.refreshDetail();
  },

  /**
   * 配置自定义导航栏状态栏高度。
   */
  setupNavigation() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 0
    });
  },

  /**
   * 刷新当前局详情展示数据。
   */
  async refreshDetail() {
    const detail = await getPartyDetail(this.data.partyId);

    this.setData({
      detail,
      confirmedUsers: detail.confirmedEntries.map((item) => item.userNickname),
      waitlistUsers: detail.waitlistEntries.map((item) => item.userNickname),
      canViewContacts: Boolean(detail.canViewContacts),
      displayTags: this.buildDisplayTags(detail.party.tags),
      remainingCount: Math.max(detail.party.maxCapacity - detail.party.confirmedCount, 0),
      isFavorited: false,
      statusTone: resolvePartyStatusTone(detail.party.status, detail.party.statusText),
      ...this.buildStatusSwitchState(detail),
      canFollowHost: this.canFollowHost(detail),
      isFollowingHost: false,
      canQuitParty: this.canQuitCurrentParty(detail),
      canWaitlistParty: this.canJoinWaitlist(detail),
      durationHourText: this.formatDurationHour(detail.party.durationMin)
    });

    void this.refreshFavoriteStatus(detail.party.partyId);
    void this.refreshFollowStatus(detail.host?.userId || "");
  },

  /**
   * 后台刷新活动收藏状态，失败时不阻塞详情展示。
   * @param partyId 活动 ID
   */
  async refreshFavoriteStatus(partyId: string) {
    try {
      const isFavorited = await isPartyFavorited(partyId);
      this.setData({ isFavorited });
    } catch (error) {
      this.setData({ isFavorited: false });
    }
  },

  /**
   * 后台刷新发起人关注状态，失败时按未关注展示。
   * @param hostUserId 发起人用户 ID
   */
  async refreshFollowStatus(hostUserId: string) {
    if (!hostUserId || !this.data.canFollowHost) {
      this.setData({ isFollowingHost: false });
      return;
    }

    try {
      const isFollowingHost = await isUserFollowing(hostUserId);
      this.setData({ isFollowingHost });
    } catch {
      this.setData({ isFollowingHost: false });
    }
  },

  /**
   * 生成带视觉色调的标签列表。
   * @param tags 原始标签列表
   * @returns 详情页展示标签
   */
  buildDisplayTags(tags: string[]) {
    return tags.slice(0, 4).map((label) => ({
      label
    }));
  },

  /**
   * 格式化活动小时数。
   * @param durationMin 活动时长分钟数
   * @returns 小时展示文案
   */
  formatDurationHour(durationMin: number) {
    const durationHour = durationMin / 60;
    return Number.isInteger(durationHour) ? String(durationHour) : durationHour.toFixed(1);
  },

  /**
   * 构建发起人状态切换按钮状态。
   * @param detail 活动详情
   * @returns 状态切换按钮数据
   */
  buildStatusSwitchState(detail: PartyDetail) {
    if (!detail.canViewContacts) {
      return {
        canSwitchPartyStatus: false,
        statusSwitchText: "",
        statusSwitchTarget: "" as const
      };
    }

    if (detail.party.status === "recruiting") {
      return {
        canSwitchPartyStatus: true,
        statusSwitchText: "结束报名",
        statusSwitchTarget: "finished" as const
      };
    }

    if (detail.party.status !== "finished") {
      return {
        canSwitchPartyStatus: false,
        statusSwitchText: "",
        statusSwitchTarget: "" as const
      };
    }

    const startAt = new Date(detail.party.startTime).getTime();
    const hasRemainingSeat = detail.party.confirmedCount < detail.party.maxCapacity;
    const canRestore = hasRemainingSeat && Number.isFinite(startAt) && Date.now() < startAt;

    return {
      canSwitchPartyStatus: canRestore,
      statusSwitchText: canRestore ? "恢复报名" : "",
      statusSwitchTarget: canRestore ? ("recruiting" as const) : ("" as const)
    };
  },

  /**
   * 判断当前查看者是否可以关注发起人。
   * @param detail 活动详情
   * @returns 是否展示关注入口
   */
  canFollowHost(detail: PartyDetail) {
    return Boolean(detail.host?.userId && !detail.canViewContacts);
  },

  /**
   * 判断当前查看者是否可以退出报名。
   * @param detail 活动详情
   * @returns 是否展示退出报名入口
   */
  canQuitCurrentParty(detail: PartyDetail) {
    return Boolean(
      detail.viewerEntry &&
      !detail.canViewContacts &&
      detail.party.status !== "finished" &&
      detail.party.status !== "cancelled"
    );
  },

  /**
   * 判断当前查看者是否可以候补报名。
   * @param detail 活动详情
   * @returns 是否展示候补报名入口
   */
  canJoinWaitlist(detail: PartyDetail) {
    const isFull = detail.party.status === "full" || detail.party.confirmedCount >= detail.party.maxCapacity;
    return Boolean(!detail.viewerEntry && !detail.canViewContacts && isFull);
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
   * 打开更多操作菜单。
   */
  handleMore() {
    wx.showActionSheet({
      itemList: ["分享给朋友", "举报活动"],
      success: (result) => {
        if (result.tapIndex === 0) {
          wx.showToast({
            title: "可点右上角分享",
            icon: "none"
          });
        }

        if (result.tapIndex === 1) {
          wx.showToast({
            title: "已收到反馈",
            icon: "none"
          });
        }
      }
    });
  },

  /**
   * 复制活动地点信息。
   */
  handleCopyVenueLocation() {
    const party = this.data.detail?.party;
    const venueText = this.buildCopyVenueText(party?.venueSummary || "", party?.venueAddress || "");
    if (!venueText) {
      wx.showToast({
        title: "暂无地点信息",
        icon: "none"
      });
      return;
    }

    wx.setClipboardData({
      data: venueText,
      success: () => {
        wx.showToast({
          title: "地点已复制",
          icon: "success"
        });
      }
    });
  },

  /**
   * 生成可复制的活动地点文本。
   * @param venueSummary 场所名称或位置摘要
   * @param venueAddress 详细地址
   * @returns 可复制的地点文本
   */
  buildCopyVenueText(venueSummary: string, venueAddress: string) {
    return [venueSummary.trim(), venueAddress.trim()].filter(Boolean).join("\n");
  },

  /**
   * 切换当前活动收藏状态。
   */
  async handleFavoriteTap() {
    if (!this.data.partyId) {
      return;
    }

    await runFavoriteSubmit.run(async () => {
      if (this.data.favoriteSubmitting) {
        return;
      }

      this.setData({ favoriteSubmitting: true });
      try {
        const isFavorited = await togglePartyFavorite(this.data.partyId);
        this.setData({ isFavorited });
        wx.showToast({
          title: isFavorited ? "已收藏" : "已取消收藏",
          icon: "none"
        });
      } catch (error) {
        wx.showToast({
          title: "收藏失败，请稍后再试",
          icon: "none"
        });
      } finally {
        this.setData({ favoriteSubmitting: false });
      }
    });
  },

  /**
   * 切换对活动发起人的关注状态。
   */
  async handleFollowHostTap() {
    const hostUserId = this.data.detail?.host?.userId || "";
    if (!hostUserId || !this.data.canFollowHost) {
      return;
    }

    const hasLoggedIn = await ensureLoggedInForAction("关注用户");
    if (!hasLoggedIn) {
      return;
    }

    await runFollowSubmit.run(async () => {
      if (this.data.followSubmitting) {
        return;
      }

      this.setData({ followSubmitting: true });
      try {
        const isFollowingHost = await toggleUserFollow(hostUserId);
        this.setData({ isFollowingHost });
        wx.showToast({
          title: isFollowingHost ? "已关注" : "已取消关注",
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
   * 切换发起人维护的活动报名状态。
   */
  async handleStatusSwitchTap() {
    if (!this.data.partyId || !this.data.statusSwitchTarget) {
      return;
    }

    await runStatusSwitchSubmit.run(async () => {
      if (this.data.statusSwitchSubmitting) {
        return;
      }

      this.setData({ statusSwitchSubmitting: true });
      try {
        const targetStatus = this.data.statusSwitchTarget;
        if (targetStatus !== "recruiting" && targetStatus !== "finished") {
          return;
        }

        await togglePartyStatus(this.data.partyId, targetStatus);
        await this.refreshDetail();
        wx.showToast({
          title: targetStatus === "finished" ? "已结束报名" : "已恢复报名",
          icon: "none"
        });
      } catch (error) {
        wx.showToast({
          title: error instanceof Error ? error.message : "状态切换失败",
          icon: "none"
        });
      } finally {
        this.setData({ statusSwitchSubmitting: false });
      }
    });
  },

  /**
   * 当前报名者主动退出活动报名。
   */
  async handleQuitPartyTap() {
    if (!this.data.partyId || this.data.quitSubmitting) {
      return;
    }

    wx.showModal({
      title: "确认退出报名",
      content: "退出后你的报名信息会从本次活动中移除，名额可能顺延给候补报名者。",
      confirmText: "退出",
      confirmColor: "#ff443f",
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        void this.submitQuitParty();
      }
    });
  },

  /**
   * 提交退出报名请求并刷新详情。
   */
  async submitQuitParty() {
    await runQuitPartySubmit.run(async () => {
      if (this.data.quitSubmitting) {
        return;
      }

      this.setData({ quitSubmitting: true });
      try {
        await quitParty(this.data.partyId);
        await this.refreshDetail();
        wx.showToast({
          title: "已退出报名",
          icon: "none"
        });
      } catch (error) {
        wx.showToast({
          title: error instanceof Error ? error.message : "退出失败",
          icon: "none"
        });
      } finally {
        this.setData({ quitSubmitting: false });
      }
    });
  },

  /**
   * 打开发起人可见的报名详情页。
   */
  handleOpenEntryDetails() {
    wx.navigateTo({
      url: `${ROUTES.partyMembers}?partyId=${this.data.partyId}`
    });
  },

  /**
   * 打开发起者公开资料页。
   */
  handleOpenHostProfile() {
    const hostUserId = this.data.detail?.host?.userId || "";
    if (!hostUserId) {
      wx.showToast({
        title: "暂无发起者资料",
        icon: "none"
      });
      return;
    }

    wx.navigateTo({
      url: `${ROUTES.hostProfile}?userId=${hostUserId}`
    });
  },

  /**
   * 打开报名确认页。
   */
  async handleJoin() {
    const hasLoggedIn = await ensureLoggedInForAction("报名活动");
    if (!hasLoggedIn) {
      return;
    }

    wx.navigateTo({
      url: `${ROUTES.entryConfirm}?partyId=${this.data.partyId}`
    });
  },

  /**
   * 加入当前局候补。
   */
  async handleWaitlist() {
    const hasLoggedIn = await ensureLoggedInForAction("报名活动");
    if (!hasLoggedIn) {
      return;
    }

    wx.navigateTo({
      url: `${ROUTES.entryConfirm}?partyId=${this.data.partyId}&mode=waitlist`
    });
  },

  /**
   * 构建分享给朋友的卡片信息。
   * @returns 分享配置
   */
  onShareAppMessage() {
    const detail = this.data.detail;
    return {
      title: detail?.party.title || "深圳K歌兴趣活动",
      path: `/pages/party-detail/index?partyId=${this.data.partyId}`,
      imageUrl: detail?.party.coverImage
    };
  }
});
