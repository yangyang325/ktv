import { getVenueList } from "../../../services/api/venue";
import type { Venue } from "../../../types/venue";

Page({
  data: {
    searchKeyword: "",
    districtOptions: ["全部", "南山", "福田", "罗湖", "龙华", "宝安"],
    currentDistrict: "全部",
    venueList: [] as Venue[]
  },

  /**
   * 页面显示时拉取门店列表。
   */
  async onShow() {
    await this.refreshVenueList();
  },

  /**
   * 记录门店搜索关键词。
   */
  async handleKeywordInput(event: WechatMiniprogram.Input) {
    this.setData({
      searchKeyword: event.detail.value
    });
    await this.refreshVenueList();
  },

  /**
   * 切换筛选区县。
   */
  async handleDistrictChange(event: WechatMiniprogram.BaseEvent) {
    const { district } = event.currentTarget.dataset as { district: string };
    this.setData({
      currentDistrict: district
    });
    await this.refreshVenueList();
  },

  /**
   * 进入填写局信息页。
   */
  handleChooseVenue(event: WechatMiniprogram.BaseEvent) {
    const { venueId } = event.currentTarget.dataset as { venueId: string };
    wx.navigateTo({
      url: `/packageCreate/pages/party-form/index?venueId=${venueId}`
    });
  },

  /**
   * 根据当前条件刷新门店列表。
   */
  async refreshVenueList() {
    const venueList = await getVenueList({
      district: this.data.currentDistrict,
      keyword: this.data.searchKeyword
    });
    this.setData({
      venueList
    });
  }
});
