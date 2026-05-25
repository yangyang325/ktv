import { getPartyDetail } from "../../../services/api/party";

type PartyDetail = Awaited<ReturnType<typeof getPartyDetail>>;
type PartyEntry = PartyDetail["confirmedEntries"][number];

interface MemberItem {
  entryId: string;
  userNickname: string;
  statusText: string;
  contactMethodLabel: string;
  contactValue: string;
  arrivalTimeText: string;
  note: string;
}

Page({
  data: {
    partyId: "",
    partyTitle: "",
    totalText: "0 人已报名 · 0 人候补",
    confirmedMembers: [] as MemberItem[],
    waitlistMembers: [] as MemberItem[],
    canViewContacts: false
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
    this.setData({
      partyTitle: detail.party.title,
      totalText: `${detail.confirmedEntries.length} 人已报名 · ${detail.waitlistEntries.length} 人候补`,
      confirmedMembers: this.buildMemberItems(detail.confirmedEntries, "confirmed"),
      waitlistMembers: this.buildMemberItems(detail.waitlistEntries, "waitlist"),
      canViewContacts: Boolean(detail.canViewContacts)
    });
  },

  /**
   * 构建报名成员展示数据。
   * @param entries 报名记录列表
   * @param entryType 报名类型
   * @returns 成员展示数据
   */
  buildMemberItems(entries: PartyEntry[], entryType: "confirmed" | "waitlist"): MemberItem[] {
    return entries.map((entry) => ({
      entryId: entry.entryId,
      userNickname: entry.userNickname,
      statusText:
        entryType === "waitlist" ? `候补 ${entry.waitlistNo || ""}`.trim() : `已报名 ${entry.seqNo || ""}`.trim(),
      contactMethodLabel: entry.contactInfo?.method === "phone" ? "手机号" : "微信号",
      contactValue: entry.contactInfo?.value || "",
      arrivalTimeText: entry.contactInfo?.arrivalTime || "未填写",
      note: entry.contactInfo?.note || ""
    }));
  }
});
