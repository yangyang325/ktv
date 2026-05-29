import { getPartyList } from "../../services/api/party";
import { getFavoriteParties } from "../../services/api/favorite";
import { DEFAULT_CITY_NAME } from "../../constants/location";
import { resolvePartyStatusTone } from "../../utils/party-status";
import type { Party } from "../../types/party";

interface DiscoverTab {
  key: string;
  label: string;
}

interface DiscoverParty extends Party {
  statusClass: string;
  progressCountText: string;
  progressRestText: string;
  isFavorited: boolean;
}

type DiscoverTabKey = "recommend" | "latest";

Page({
  data: {
    keyword: "",
    cityName: DEFAULT_CITY_NAME,
    activeTab: "recommend",
    tabs: [
      { key: "recommend", label: "推荐" },
      { key: "latest", label: "最新" }
    ] as DiscoverTab[],
    allPartyList: [] as DiscoverParty[],
    partyList: [] as DiscoverParty[]
  },

  /**
   * 页面展示时加载可加入的局。
   */
  async onShow() {
    this.getTabBar().setData({ selected: 1 });

    const [partyList, favoritePartyIds] = await Promise.all([
      getPartyList(),
      getFavoritePartyIdsSafely()
    ]);
    const allPartyList = buildDiscoverPartyList(partyList, favoritePartyIds);
    this.setData({
      allPartyList,
      partyList: filterDiscoverPartyList(allPartyList, this.data.activeTab as DiscoverTabKey, this.data.keyword)
    });
  },

  /**
   * 切换发现页分类。
   * @param event 点击事件
   */
  handleTabChange(event: WechatMiniprogram.BaseEvent) {
    const { key } = event.currentTarget.dataset as { key: DiscoverTabKey };

    if (!key || key === this.data.activeTab) {
      return;
    }

    this.setData({
      activeTab: key,
      partyList: filterDiscoverPartyList(this.data.allPartyList, key, this.data.keyword)
    });
  },

  /**
   * 更新搜索关键词。
   * @param event 输入事件
   */
  handleKeywordInput(event: WechatMiniprogram.Input) {
    const keyword = event.detail.value;
    this.setData({
      keyword,
      partyList: filterDiscoverPartyList(this.data.allPartyList, this.data.activeTab as DiscoverTabKey, keyword)
    });
  },

  /**
   * 处理搜索提交。
   */
  handleSearch() {
    const keyword = this.data.keyword.trim();
    this.setData({
      partyList: filterDiscoverPartyList(this.data.allPartyList, this.data.activeTab as DiscoverTabKey, keyword)
    });

    wx.showToast({
      title: keyword ? "已按标题搜索" : "输入标题试试",
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
  },

  /**
   * 构建发现页分享给朋友的卡片信息。
   * @returns 分享配置
   */
  onShareAppMessage() {
    return {
      title: "发现深圳K歌活动",
      path: "/pages/discover/index"
    };
  },

  /**
   * 构建发现页分享到朋友圈的信息。
   * @returns 分享配置
   */
  onShareTimeline() {
    return {
      title: "发现深圳K歌活动",
      query: ""
    };
  }
});

/**
 * 构建发现页专用的局卡片展示数据。
 * @param partyList 原始局列表
 * @param favoritePartyIds 当前用户已收藏活动 ID 集合
 * @returns 发现页局列表
 */
function buildDiscoverPartyList(
  partyList: Party[],
  favoritePartyIds: Set<string>
): DiscoverParty[] {
  return partyList.map((party) => ({
    ...party,
    statusClass: getStatusClass(party),
    ...splitProgressText(party.progressText),
    isFavorited: favoritePartyIds.has(party.partyId)
  }));
}

/**
 * 安全读取当前用户收藏活动 ID，读取失败时不影响发现页列表。
 * @returns 已收藏活动 ID 集合
 */
async function getFavoritePartyIdsSafely(): Promise<Set<string>> {
  try {
    const favoriteParties = await getFavoriteParties();
    return new Set(favoriteParties.map((party) => party.partyId));
  } catch {
    return new Set();
  }
}

/**
 * 将人数文案拆成当前人数和容量后缀。
 * @param progressText 报名人数文案
 * @returns 可分别着色的人数文案
 */
function splitProgressText(progressText: string) {
  const match = progressText.match(/^([^/]+)\s*(\/\s*.+)$/);
  if (!match) {
    return {
      progressCountText: progressText,
      progressRestText: ""
    };
  }

  return {
    progressCountText: match[1].trim(),
    progressRestText: match[2].replace(/\s+/g, "")
  };
}

/**
 * 根据发现页标签和标题关键词筛选活动。
 * @param partyList 原始发现页活动列表
 * @param tabKey 当前标签
 * @param keyword 标题搜索关键词
 * @returns 处理后的发现页活动列表
 */
function filterDiscoverPartyList(
  partyList: DiscoverParty[],
  tabKey: DiscoverTabKey,
  keyword: string
): DiscoverParty[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const searchedPartyList = normalizedKeyword
    ? partyList.filter((party) => party.title.toLowerCase().includes(normalizedKeyword))
    : partyList;

  if (tabKey === "latest") {
    return sortPartiesByCreatedAtDesc(searchedPartyList);
  }

  return searchedPartyList;
}

/**
 * 按活动创建时间倒序排列。
 * @param partyList 活动列表
 * @returns 最新创建的活动优先
 */
function sortPartiesByCreatedAtDesc(partyList: DiscoverParty[]): DiscoverParty[] {
  return [...partyList].sort((left, right) =>
    String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
  );
}

/**
 * 根据局状态生成样式类名。
 * @param party 局信息
 * @returns 状态样式类名
 */
function getStatusClass(party: Party) {
  return resolvePartyStatusTone(party.status, party.statusText);
}
