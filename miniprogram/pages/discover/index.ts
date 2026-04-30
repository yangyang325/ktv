import { getPartyList } from "../../services/api/party";
import type { Party } from "../../types/party";

interface DiscoverFilter {
  key: string;
  label: string;
  suffix: string;
}

interface DiscoverTab {
  key: string;
  label: string;
}

interface DiscoverViewMode {
  key: string;
  label: string;
}

interface DiscoverParty extends Party {
  avatars: string[];
  distanceText: string;
  statusClass: string;
}

const distancePool = ["1.35km", "2.38km", "3.85km", "4.12km"];
const avatarPool = [
  ["周", "麦", "小", "陈"],
  ["阿", "林", "K", "妍"],
  ["麦", "亮", "安", "杨"],
  ["老", "歌", "王", "苏"]
];

Page({
  data: {
    keyword: "",
    cityName: "成都市",
    cityOptions: ["成都市", "重庆市", "深圳市", "广州市", "上海市"],
    activeTab: "recommend",
    activeViewMode: "card",
    tabs: [
      { key: "recommend", label: "推荐" },
      { key: "nearby", label: "附近" },
      { key: "latest", label: "最新" }
    ] as DiscoverTab[],
    filters: [
      { key: "near", label: "附近", suffix: "⌄" },
      { key: "area", label: "区域", suffix: "⌄" },
      { key: "people", label: "人数", suffix: "⌄" },
      { key: "fee", label: "费用", suffix: "⌄" },
      { key: "more", label: "筛选", suffix: "▽" }
    ] as DiscoverFilter[],
    viewModes: [
      { key: "list", label: "列表" },
      { key: "card", label: "卡片" }
    ] as DiscoverViewMode[],
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
   * 处理筛选项点击。
   * @param event 点击事件
   */
  handleFilterTap(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    const filter = this.data.filters.find((item) => item.key === key);
    wx.showToast({
      title: filter ? `${filter.label}筛选` : "筛选",
      icon: "none"
    });
  },

  /**
   * 切换列表展示模式。
   * @param event 点击事件
   */
  handleViewModeTap(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: string };
    this.setData({ activeViewMode: key });
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
    avatars: avatarPool[index % avatarPool.length],
    distanceText: distancePool[index % distancePool.length],
    statusClass: getStatusClass(party, index)
  }));
}

/**
 * 根据局状态生成样式类名。
 * @param party 局信息
 * @param index 当前列表位置
 * @returns 状态样式类名
 */
function getStatusClass(party: Party, index: number) {
  if (party.status === "finished") {
    return "done";
  }

  if (party.status === "full") {
    return "full";
  }

  if (party.statusText === "进行中" || index === 0) {
    return "live";
  }

  if (index === 2) {
    return "hot";
  }

  return "signup";
}
