import { getVenueList } from "../../../services/api/venue";
import { validatePartyForm } from "../../../utils/validators";

Page({
  data: {
    venueId: "",
    venueSummary: "待选择门店",
    form: {
      title: "羊羊的 K 歌局",
      date: "2026-04-25",
      startTime: "19:30",
      duration: "180",
      roomFee: "2400",
      maxCapacity: "12",
      notes: "欢迎新人，不限歌路。"
    }
  },

  /**
   * 初始化门店摘要。
   */
  async onLoad(options: Record<string, string>) {
    const venueId = options.venueId || "venue-001";
    const venueList = await getVenueList();
    const currentVenue = venueList.find((item) => item.venueId === venueId);
    this.setData({
      venueId,
      venueSummary: currentVenue ? `${currentVenue.name} · ${currentVenue.district}` : "自定义门店"
    });
  },

  /**
   * 更新表单字段值。
   */
  handleFieldChange(event: WechatMiniprogram.Input) {
    const { field } = event.currentTarget.dataset as { field: string };
    const value = event.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
  },

  /**
   * 进入接龙预览页。
   */
  handlePreview() {
    const validation = validatePartyForm({
      title: this.data.form.title,
      venueId: this.data.venueId,
      venueSummary: this.data.venueSummary,
      startDate: this.data.form.date,
      startTime: this.data.form.startTime,
      durationMin: Number(this.data.form.duration),
      roomFee: Number(this.data.form.roomFee) * 100,
      maxCapacity: Number(this.data.form.maxCapacity),
      notes: this.data.form.notes,
      tags: []
    });

    if (!validation.valid) {
      wx.showToast({
        title: validation.message,
        icon: "none"
      });
      return;
    }

    wx.setStorageSync("partyDraftForm", {
      title: this.data.form.title,
      venueId: this.data.venueId,
      venueSummary: this.data.venueSummary,
      startDate: this.data.form.date,
      startTime: this.data.form.startTime,
      durationMin: Number(this.data.form.duration),
      roomFee: Number(this.data.form.roomFee) * 100,
      maxCapacity: Number(this.data.form.maxCapacity),
      notes: this.data.form.notes,
      tags: []
    });

    wx.navigateTo({
      url: "/packageCreate/pages/party-preview/index"
    });
  }
});
