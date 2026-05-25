import { getPartyList } from "../../services/api/party";
import { DEFAULT_CITY_NAME } from "../../constants/location";
import { resolvePartyStatusTone } from "../../utils/party-status";
import type { Party } from "../../types/party";

interface DiscoverTab {
  key: string;
  label: string;
}

interface DiscoverParty extends Party {
  distanceText: string;
  statusClass: string;
}

const distancePool = ["1.35km", "2.38km", "3.85km", "4.12km"];

Page({
  data: {
    keyword: "",
    cityName: DEFAULT_CITY_NAME,
    cityOptions: ["深圳市"],
    activeTab: "recommend",
    tabs: [
      { key: "recommend", label: "推荐" },
      { key: "city", label: "同城" },
      { key: "latest", label: "最新" }
    ] as DiscoverTab[],
    partyList: [] as DiscoverParty[]
  },

  /**
   * 页面加载时同步城市偏好。
   */
  onLoad() {
    const cityName = wx.getStorageSync("selectedCityName");
    if (cityName) {
      this.setData({ cityName });
    }
  },

  /**
   * 页面展示时加载可加入的局。
   */
  async onShow() {
    this.getTabBar().setData({ selected: 1 });

    const partyList = await getPartyList();
    this.setData({ partyList: buildDiscoverPartyList(partyList) });
  },

  /**
   * 切换发现页分类。
   * @param event 点击事件
   */
  handleTabChange(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    this.setData({ activeTab: key });
  },

  /**
   * 更新搜索关键词。
   * @param event 输入事件
   */
  handleKeywordInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
  },

  /**
   * 打开城市选择面板。
   */
  handleCityTap() {
    wx.showActionSheet({
      itemList: this.data.cityOptions,
      success: (result) => {
        const cityName = this.data.cityOptions[result.tapIndex];
        if (!cityName) {
          return;
        }

        wx.setStorageSync("selectedCityName", cityName);
        this.setData({ cityName });
      }
    });
  },

  /**
   * 处理搜索提交。
   */
  handleSearch() {
    wx.showToast({
      title: this.data.keyword ? "已更新搜索" : "输入关键词试试",
      icon: "none"
    });
  },

  /**
   * 打开局详情。
   * @param event 点击事件
   */
  handlePartyTap(event: WechatMiniprogram.BaseEvent) {
    const { partyId } = event.currentTarget.dataset as { partyId: string };
    if (!partyId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/party-detail/index?partyId=${partyId}`
    });
  }
});

/**
 * 构建发现页专用的局卡片展示数据。
 * @param partyList 原始局列表
 * @returns 发现页局列表
 */
function buildDiscoverPartyList(partyList: Party[]): DiscoverParty[] {
  return partyList.map((party, index) => ({
    ...party,
    distanceText: distancePool[index % distancePool.length],
    statusClass: getStatusClass(party)
  }));
}

/**
 * 根据局状态生成样式类名。
 * @param party 局信息
 * @returns 状态样式类名
 */
function getStatusClass(party: Party) {
  return resolvePartyStatusTone(party.status, party.statusText);
}
