import { getPartyDetail, promoteWaitlistEntry } from "../../../services/api/party";
import { createSubmitGuard } from "../../../utils/submit-guard";

type PartyDetail = Awaited<ReturnType<typeof getPartyDetail>>;
type PartyEntry = PartyDetail["confirmedEntries"][number];

interface PartySummary {
  title: string;
  coverImage: string;
  timeText: string;
  venueText: string;
  confirmedCount: number;
  maxCapacity: number;
}

interface MemberItem {
  entryId: string;
  userNickname: string;
  userAvatarUrl: string;
  genderText: string;
  contactValue: string;
  contactDisplayValue: string;
  arrivalTimeText: string;
  note: string;
  submittedAtText: string;
  submittedAtFullText: string;
  timeSortValue: number;
  entryType: PartyEntry["entryType"];
  waitlistNo: number | null;
}

interface MemberTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      entryId?: string;
    };
  };
}

const runMemberPromoteSubmit = createSubmitGuard();

Page({
  data: {
    partyId: "",
    partySummary: null as PartySummary | null,
    memberList: [] as MemberItem[],
    selectedMember: null as MemberItem | null,
    sortAscending: true,
    canViewContacts: false,
    promotingEntryId: ""
  },

  /**
   * 初始化报名详情页。
   * @param options 页面路由参数
   */
  async onLoad(options: Record<string, string>) {
    const partyId = options.partyId || "";
    this.setData({ partyId });
    await this.loadEntryDetail();
  },

  /**
   * 页面展示时刷新报名数据。
   */
  onShow() {
    if (!this.data.partyId) {
      return;
    }

    void this.loadEntryDetail();
  },

  /**
   * 读取并展示报名详情。
   */
  async loadEntryDetail() {
    if (!this.data.partyId) {
      return;
    }

    const detail = await getPartyDetail(this.data.partyId);
    const visibleConfirmedEntries = this.filterViewerEntries(detail.confirmedEntries, detail.viewerEntry);
    const visibleWaitlistEntries = this.filterViewerEntries(detail.waitlistEntries, detail.viewerEntry);
    const memberList = this.sortMembersByTime(
      [
        ...this.buildMemberItems(visibleConfirmedEntries),
        ...this.buildMemberItems(visibleWaitlistEntries)
      ],
      this.data.sortAscending
    );
    const selectedEntryId = this.data.selectedMember?.entryId || "";
    const selectedMember = memberList.find((member) => member.entryId === selectedEntryId) || null;

    this.setData({
      partySummary: this.buildPartySummary(detail),
      memberList,
      selectedMember,
      canViewContacts: Boolean(detail.canViewContacts)
    });
  },

  /**
   * 构建活动摘要卡片数据。
   * @param detail 活动详情
   * @returns 活动摘要展示数据
   */
  buildPartySummary(detail: PartyDetail): PartySummary {
    return {
      title: detail.party.title,
      coverImage: detail.party.coverImage,
      timeText: detail.party.timeSummary,
      venueText: detail.party.venueSummary,
      confirmedCount: detail.party.confirmedCount,
      maxCapacity: detail.party.maxCapacity
    };
  },

  /**
   * 构建报名成员展示数据。
   * @param entries 报名记录列表
   * @returns 成员展示数据
   */
  buildMemberItems(entries: PartyEntry[]): MemberItem[] {
    return entries.map((entry) => {
      const contactValue = entry.contactInfo?.value || "";
      const createdAt = new Date(entry.createdAt);

      return {
        entryId: entry.entryId,
        userNickname: entry.userNickname,
        userAvatarUrl: entry.userAvatarUrl || "",
        genderText: entry.userGender || "保密",
        contactValue,
        contactDisplayValue: contactValue ? this.maskContactValue(contactValue) : "未填写",
        arrivalTimeText: this.formatArrivalTime(entry.contactInfo?.arrivalTime || ""),
        note: entry.contactInfo?.note || "未填写",
        submittedAtText: this.formatDateTime(entry.createdAt, "short"),
        submittedAtFullText: this.formatDateTime(entry.createdAt, "full"),
        timeSortValue: createdAt.getTime() || 0,
        entryType: entry.entryType,
        waitlistNo: entry.waitlistNo
      };
    });
  },

  /**
   * 过滤当前查看者自己的报名记录。
   * @param entries 报名记录列表
   * @param viewerEntry 当前查看者的报名记录
   * @returns 不包含当前查看者自己的报名记录列表
   */
  filterViewerEntries(entries: PartyEntry[], viewerEntry: PartyEntry | null): PartyEntry[] {
    if (!viewerEntry) {
      return entries;
    }

    return entries.filter((entry) => entry.userId !== viewerEntry.userId);
  },

  /**
   * 按报名时间排序成员列表。
   * @param members 成员列表
   * @param ascending 是否升序
   * @returns 排序后的成员列表
   */
  sortMembersByTime(members: MemberItem[], ascending: boolean) {
    return [...members].sort((left, right) =>
      ascending ? left.timeSortValue - right.timeSortValue : right.timeSortValue - left.timeSortValue
    );
  },

  /**
   * 切换报名时间排序方向。
   */
  handleSortTap() {
    const sortAscending = !this.data.sortAscending;
    this.setData({
      sortAscending,
      memberList: this.sortMembersByTime(this.data.memberList, sortAscending)
    });
  },

  /**
   * 打开单个报名者详情。
   * @param event 点击事件
   */
  handleMemberDetailTap(event: MemberTapEvent) {
    const entryId = event.currentTarget.dataset.entryId || "";
    const selectedMember = this.data.memberList.find((member) => member.entryId === entryId) || null;

    if (selectedMember) {
      this.setData({ selectedMember });
    }
  },

  /**
   * 返回报名者列表。
   */
  handleBackToMemberList() {
    this.setData({ selectedMember: null });
  },

  /**
   * 复制当前详情中的报名者联系方式。
   */
  handleSelectedMemberCopyTap() {
    if (this.data.selectedMember) {
      this.copyMemberContact(this.data.selectedMember);
    }
  },

  /**
   * 点击详情状态按钮时将候补报名者确认为正式成员。
   */
  handleSelectedMemberStatusTap() {
    const member = this.data.selectedMember;
    if (!member || member.entryType !== "waitlist") {
      return;
    }

    this.confirmPromoteMember(member);
  },

  /**
   * 确认是否将候补报名者调整为正式成员。
   * @param member 报名者展示数据
   */
  confirmPromoteMember(member: MemberItem) {
    if (!this.data.canViewContacts || member.entryType !== "waitlist") {
      return;
    }

    wx.showModal({
      title: "确认报名者",
      content: `确认将「${member.userNickname}」设为正式成员吗？`,
      confirmText: "确认",
      confirmColor: "#18a861",
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        void this.submitPromoteMember(member.entryId);
      }
    });
  },

  /**
   * 提交候补转正式请求并刷新列表。
   * @param entryId 候补报名记录 ID
   */
  async submitPromoteMember(entryId: string) {
    if (!entryId || !this.data.partyId) {
      return;
    }

    await runMemberPromoteSubmit.run(async () => {
      if (this.data.promotingEntryId) {
        return;
      }

      this.setData({ promotingEntryId: entryId });
      try {
        await promoteWaitlistEntry(this.data.partyId, entryId);
        await this.loadEntryDetail();
        wx.showToast({
          title: "已确认报名者",
          icon: "none"
        });
      } catch (error) {
        wx.showToast({
          title: error instanceof Error ? error.message : "调整失败",
          icon: "none"
        });
      } finally {
        this.setData({ promotingEntryId: "" });
      }
    });
  },

  /**
   * 复制报名者联系方式。
   * @param member 报名者展示数据
   */
  copyMemberContact(member: MemberItem) {
    if (!member.contactValue) {
      wx.showToast({
        title: "暂无联系方式",
        icon: "none"
      });
      return;
    }

    wx.setClipboardData({
      data: member.contactValue,
      success: () => {
        wx.showToast({
          title: "联系方式已复制",
          icon: "success"
        });
      }
    });
  },

  /**
   * 格式化报名时间。
   * @param value ISO 时间字符串
   * @param mode 展示模式
   * @returns 时间展示文案
   */
  formatDateTime(value: string, mode: "short" | "full") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "未记录";
    }

    const month = this.padNumber(date.getMonth() + 1);
    const day = this.padNumber(date.getDate());
    const hour = this.padNumber(date.getHours());
    const minute = this.padNumber(date.getMinutes());
    const second = this.padNumber(date.getSeconds());

    if (mode === "short") {
      return `${month}-${day} ${hour}:${minute}`;
    }

    return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  /**
   * 格式化预计到达时间。
   * @param value 用户填写的到达时间
   * @returns 到达时间展示文案
   */
  formatArrivalTime(value: string) {
    if (!value) {
      return "未填写";
    }

    return value.includes("预计") ? value : `预计${value}到达`;
  },

  /**
   * 脱敏展示联系方式。
   * @param value 原始联系方式
   * @returns 脱敏后的联系方式
   */
  maskContactValue(value: string) {
    const text = value.trim();
    const digits = text.replace(/\D/g, "");

    if (digits.length >= 7) {
      return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
    }

    if (text.length <= 4) {
      return `${text.slice(0, 1)}***`;
    }

    return `${text.slice(0, 2)}****${text.slice(-2)}`;
  },

  /**
   * 数字补零。
   * @param value 数字
   * @returns 两位数字文本
   */
  padNumber(value: number) {
    return String(value).padStart(2, "0");
  }
});
