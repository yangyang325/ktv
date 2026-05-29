import { getPartyDetail, joinParty, joinWaitlist } from "../../../services/api/party";
import type { EntryContactInfo, EntryContactMethod } from "../../../types/entry";
import { ensureLoggedInForAction } from "../../../utils/auth";
import { createSubmitGuard } from "../../../utils/submit-guard";

type PartyDetail = Awaited<ReturnType<typeof getPartyDetail>>;
type ContactMethodOption = {
  label: string;
  value: EntryContactMethod;
  placeholder: string;
};

interface PickerChangeEvent extends WechatMiniprogram.BaseEvent {
  detail: {
    value: number | string;
  };
}

const CONTACT_METHOD_OPTIONS: ContactMethodOption[] = [
  {
    label: "微信号",
    value: "wechat",
    placeholder: "填写微信号，便于发起人拉群"
  },
  {
    label: "手机号",
    value: "phone",
    placeholder: "填写手机号，便于发起人集合通知"
  }
];
const runEntryConfirmSubmit = createSubmitGuard();

Page({
  data: {
    partyId: "",
    entryMode: "join" as "join" | "waitlist",
    detail: null as PartyDetail | null,
    displayTitle: "",
    displayTags: [] as string[],
    durationHourText: "3",
    capacityConfirmedCount: 6,
    capacityMaxCount: 10,
    remainingCount: 4,
    distanceText: "1.35km",
    payAmount: "68",
    contactMethodOptions: CONTACT_METHOD_OPTIONS,
    contactMethodIndex: 0,
    contactMethodLabel: CONTACT_METHOD_OPTIONS[0].label,
    contactValuePlaceholder: CONTACT_METHOD_OPTIONS[0].placeholder,
    contactForm: {
      method: CONTACT_METHOD_OPTIONS[0].value,
      value: "",
      arrivalTime: "",
      note: ""
    },
    agreementChecked: false,
    submitting: false
  },

  /**
   * 初始化报名确认页数据。
   * @param options 页面路由参数
   */
  async onLoad(options: Record<string, string>) {
    const partyId = options.partyId || "";
    if (!partyId) {
      wx.showToast({
        title: "缺少活动信息",
        icon: "none"
      });
      return;
    }
    this.setData({
      partyId,
      entryMode: options.mode === "waitlist" ? "waitlist" : "join"
    });
    await this.refreshDetail();
  },

  /**
   * 刷新活动确认信息。
   */
  async refreshDetail() {
    const detail = await getPartyDetail(this.data.partyId);
    const capacityCounts = this.parseCapacityCounts(detail.party.progressText, detail.party.confirmedCount, detail.party.maxCapacity);
    this.setData({
      detail,
      displayTitle: this.formatDisplayTitle(detail.party.title),
      displayTags: this.buildDisplayTags(detail.party.tags),
      durationHourText: this.formatDurationHour(detail.party.durationMin),
      capacityConfirmedCount: capacityCounts.confirmedCount,
      capacityMaxCount: capacityCounts.maxCapacity,
      remainingCount: Math.max(capacityCounts.maxCapacity - capacityCounts.confirmedCount, 0),
      payAmount: this.formatPayAmount(detail.party.priceText)
    });
  },

  /**
   * 格式化确认页活动标题。
   * @param title 原始活动标题
   * @returns 适合确认卡片展示的标题
   */
  formatDisplayTitle(title: string) {
    return title.replace("🎤", " / ").replace(/\s+/g, "").replace("/", " / ");
  },

  /**
   * 生成确认页活动标签。
   * @param tags 原始标签列表
   * @returns 确认页标签
   */
  buildDisplayTags(tags: string[]) {
    const normalizedTags = tags.filter((tag) => tag !== "流行");
    return ["清厅", ...normalizedTags].slice(0, 3);
  },

  /**
   * 格式化活动时长小时数。
   * @param durationMin 活动时长分钟数
   * @returns 小时文本
   */
  formatDurationHour(durationMin: number) {
    const durationHour = durationMin / 60;
    return Number.isInteger(durationHour) ? String(durationHour) : durationHour.toFixed(1);
  },

  /**
   * 解析报名人数和人数上限。
   * @param progressText 原始进度文本
   * @param confirmedCount 已确认人数
   * @param maxCapacity 最大容量
   * @returns 报名人数和人数上限
   */
  parseCapacityCounts(progressText: string, confirmedCount: number, maxCapacity: number) {
    const matched = progressText.match(/(\d+)\s*\/\s*(\d+)/);
    if (matched) {
      return {
        confirmedCount: Number(matched[1]),
        maxCapacity: Number(matched[2])
      };
    }

    return { confirmedCount, maxCapacity };
  },

  /**
   * 格式化AA参考金额。
   * @param priceText 价格文本
   * @returns 金额数字文本
   */
  formatPayAmount(priceText: string) {
    const matched = priceText.match(/\d+(?:\.\d+)?/);
    return matched ? matched[0] : "0";
  },

  /**
   * 切换协议勾选状态。
   */
  toggleAgreement() {
    this.setData({
      agreementChecked: !this.data.agreementChecked
    });
  },

  /**
   * 打开活动参与协议。
   */
  openAgreement() {
    wx.navigateTo({
      url: `/pages/common/webview/index?title=${encodeURIComponent("K歌活动参与须知")}`
    });
  },

  /**
   * 切换单次报名联系信息方式。
   * @param event 选择器事件
   */
  handleContactMethodChange(event: PickerChangeEvent) {
    const nextIndex = Number(event.detail.value) || 0;
    const safeIndex = CONTACT_METHOD_OPTIONS[nextIndex] ? nextIndex : 0;
    const option = CONTACT_METHOD_OPTIONS[safeIndex];

    this.setData({
      contactMethodIndex: safeIndex,
      contactMethodLabel: option.label,
      contactValuePlaceholder: option.placeholder,
      "contactForm.method": option.value,
      "contactForm.value": ""
    });
  },

  /**
   * 更新单次报名联系信息。
   * @param event 输入事件
   */
  handleContactValueInput(event: WechatMiniprogram.Input) {
    this.setData({
      "contactForm.value": event.detail.value
    });
  },

  /**
   * 更新预计到达时间。
   * @param event 时间选择事件
   */
  handleArrivalTimeChange(event: PickerChangeEvent) {
    this.setData({
      "contactForm.arrivalTime": String(event.detail.value || "")
    });
  },

  /**
   * 更新报名备注。
   * @param event 输入事件
   */
  handleContactNoteInput(event: WechatMiniprogram.Input) {
    this.setData({
      "contactForm.note": event.detail.value
    });
  },

  /**
   * 构建单次报名联系信息。
   * @returns 联系信息或空值
   */
  buildContactInfo(): EntryContactInfo | null {
    const contactValue = this.data.contactForm.value.trim();
    const arrivalTime = this.data.contactForm.arrivalTime.trim();
    const note = this.data.contactForm.note.trim();

    if (!contactValue) {
      return null;
    }

    return {
      method: this.data.contactForm.method,
      value: contactValue,
      ...(arrivalTime ? { arrivalTime } : {}),
      ...(note ? { note } : {})
    };
  },

  /**
   * 提交并确认报名。
   */
  async handleConfirm() {
    if (this.data.submitting) {
      return;
    }

    const hasLoggedIn = await ensureLoggedInForAction("报名活动");
    if (!hasLoggedIn) {
      return;
    }

    if (!this.data.agreementChecked) {
      wx.showToast({
        title: "请先同意参与协议",
        icon: "none"
      });
      return;
    }

    const contactInfo = this.buildContactInfo();
    if (!contactInfo) {
      wx.showToast({
        title: "请填写入群联系信息",
        icon: "none"
      });
      return;
    }

    await runEntryConfirmSubmit.run(async () => {
      if (this.data.submitting) {
        return;
      }

      this.setData({ submitting: true });
      try {
        if (this.data.entryMode === "waitlist") {
          await joinWaitlist(this.data.partyId, contactInfo);
        } else {
          await joinParty(this.data.partyId, contactInfo);
        }
        wx.showToast({
          title: this.data.entryMode === "waitlist" ? "候补成功" : "报名成功",
          icon: "success"
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 600);
      } catch (error) {
        wx.showToast({
          title: error instanceof Error ? error.message : "报名失败",
          icon: "none"
        });
      } finally {
        this.setData({ submitting: false });
      }
    });
  }
});
