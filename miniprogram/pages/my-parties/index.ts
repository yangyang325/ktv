import { getMyPartyTabs } from "../../services/api/party";
import type { MyPartyTabs } from "../../types/common";
import type { Party } from "../../types/party";

type MyPartyTabKey = "all" | "hosting" | "joined" | "history";
type PartyRelation = "hosting" | "joined" | "waitlist" | "history";

interface MyPartyTab {
  key: MyPartyTabKey;
  label: string;
  count: number;
}

interface MyPartyStat {
  key: string;
  label: string;
  value: number;
  icon: string;
  tone: string;
}

interface BottomNavItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  activeIcon: string;
  active: boolean;
  badge?: string;
}

interface MyPartyCard extends Party {
  actionText: string;
  avatars: string[];
  displayTags: string[];
  isFinished: boolean;
  progressCountText: string;
  progressRestText: string;
  roleTone: string;
  statusTone: string;
  tabKeys: MyPartyTabKey[];
}

interface PartyTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      id?: string;
      key?: MyPartyTabKey;
      path?: string;
    };
  };
}

const TAB_LABELS: Array<Omit<MyPartyTab, "count">> = [
  { key: "all", label: "全部" },
  { key: "hosting", label: "我发起的" },
  { key: "joined", label: "我报名的" },
  { key: "history", label: "已结束" }
];

const AVATAR_NAMES = ["羊", "麦", "秋", "明", "周", "林"];

Page({
  data: {
    allParties: [] as MyPartyCard[],
    bottomNav: createBottomNav(),
    currentTab: "all" as MyPartyTabKey,
    emptyDescription: "换个筛选看看，或发起一个新的 K 局。",
    emptyTitle: "这里还没有组局",
    partyList: [] as MyPartyCard[],
    stats: createStats(0, 0, 0),
    tabs: createTabs({
      hosting: [],
      joined: [],
      waitlist: [],
      history: []
    })
  },

  /**
   * 页面展示时刷新我的组局数据。
   */
  async onShow() {
    const groupedParties = await getMyPartyTabs("user-host");
    const allParties = createMyPartyCards(groupedParties);
    const partyList = filterParties(allParties, this.data.currentTab);

    this.setData({
      allParties,
      emptyDescription: createEmptyDescription(this.data.currentTab),
      partyList,
      stats: createStats(groupedParties.hosting.length, groupedParties.joined.length + groupedParties.waitlist.length, countPending(allParties)),
      tabs: createTabs(groupedParties)
    });
  },

  /**
   * 切换我的组局筛选。
   * @param event 点击事件
   */
  handleTabChange(event: PartyTapEvent) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.currentTab) {
      return;
    }

    this.setData({
      currentTab: key,
      emptyDescription: createEmptyDescription(key),
      partyList: filterParties(this.data.allParties, key)
    });
  },

  /**
   * 打开组局详情。
   * @param event 点击事件
   */
  handleCardTap(event: PartyTapEvent) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/party-detail/index?partyId=${id}`
    });
  },

  /**
   * 打开发起组局页面。
   */
  handleCreateTap() {
    wx.navigateTo({
      url: "/pages/launch/index"
    });
  },

  /**
   * 切换底部导航。
   * @param event 点击事件
   */
  handleBottomNavTap(event: PartyTapEvent) {
    const { path } = event.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.switchTab({
      url: `/${path}`
    });
  }
});

/**
 * 创建底部导航配置。
 * @returns 底部导航项
 */
function createBottomNav(): BottomNavItem[] {
  return [
    {
      key: "home",
      label: "首页",
      path: "pages/home/index",
      icon: "/assets/images/ktv/tab-home.png",
      activeIcon: "/assets/images/ktv/tab-home-active.png",
      active: false
    },
    {
      key: "discover",
      label: "发现",
      path: "pages/discover/index",
      icon: "/assets/images/ktv/tab-discover.png",
      activeIcon: "/assets/images/ktv/tab-discover-active.png",
      active: false
    },
    {
      key: "messages",
      label: "消息",
      path: "pages/messages/index",
      icon: "/assets/images/ktv/tab-messages.png",
      activeIcon: "/assets/images/ktv/tab-messages-active.png",
      active: false,
      badge: "3"
    },
    {
      key: "profile",
      label: "我的",
      path: "pages/profile/index",
      icon: "/assets/images/ktv/tab-profile.png",
      activeIcon: "/assets/images/ktv/tab-profile-active.png",
      active: true
    }
  ];
}

/**
 * 创建顶部统计数据。
 * @param hostingCount 发起数
 * @param joinedCount 报名数
 * @param pendingCount 待开始数
 * @returns 顶部统计项
 */
function createStats(hostingCount: number, joinedCount: number, pendingCount: number): MyPartyStat[] {
  return [
    { key: "hosting", label: "我发起的", value: hostingCount, icon: "⚑", tone: "purple" },
    { key: "joined", label: "我报名的", value: joinedCount, icon: "♚", tone: "blue" },
    { key: "pending", label: "待开始", value: pendingCount, icon: "◷", tone: "orange" }
  ];
}

/**
 * 创建筛选标签数据。
 * @param groupedParties 我的组局分组
 * @returns 筛选标签项
 */
function createTabs(groupedParties: MyPartyTabs<Party>): MyPartyTab[] {
  const allCount = countUniqueParties(groupedParties);
  const joinedCount = groupedParties.joined.length + groupedParties.waitlist.length;

  return TAB_LABELS.map((item) => ({
    ...item,
    count: item.key === "all"
      ? allCount
      : item.key === "joined"
        ? joinedCount
        : groupedParties[item.key].length
  }));
}

/**
 * 创建我的组局卡片数据。
 * @param groupedParties 我的组局分组
 * @returns 卡片数据
 */
function createMyPartyCards(groupedParties: MyPartyTabs<Party>): MyPartyCard[] {
  const cardMap = new Map<string, MyPartyCard>();

  appendPartyCards(cardMap, groupedParties.hosting, "hosting");
  appendPartyCards(cardMap, groupedParties.joined, "joined");
  appendPartyCards(cardMap, groupedParties.waitlist, "waitlist");
  appendPartyCards(cardMap, groupedParties.history, "history");

  return Array.from(cardMap.values());
}

/**
 * 追加并合并组局卡片。
 * @param cardMap 卡片映射
 * @param parties 局列表
 * @param relation 当前用户与局的关系
 */
function appendPartyCards(cardMap: Map<string, MyPartyCard>, parties: Party[], relation: PartyRelation) {
  parties.forEach((party) => {
    const nextTabKey = relation === "waitlist" ? "joined" : relation === "history" ? "history" : relation;
    const existing = cardMap.get(party.partyId);
    if (existing) {
      existing.tabKeys = Array.from(new Set([...existing.tabKeys, nextTabKey]));
      return;
    }

    cardMap.set(party.partyId, createMyPartyCard(party, relation, ["all", nextTabKey]));
  });
}

/**
 * 创建单个组局卡片。
 * @param party 局信息
 * @param relation 当前用户与局的关系
 * @param tabKeys 归属筛选标签
 * @returns 卡片数据
 */
function createMyPartyCard(party: Party, relation: PartyRelation, tabKeys: MyPartyTabKey[]): MyPartyCard {
  const isFinished = party.status === "finished" || relation === "history";
  const progressParts = splitProgressText(party.progressText);

  return {
    ...party,
    actionText: createActionText(relation, isFinished),
    avatars: createAvatars(party.confirmedCount),
    displayTags: party.tags.slice(0, 3),
    isFinished,
    progressCountText: progressParts.count,
    progressRestText: progressParts.rest,
    roleTone: isFinished ? "muted" : relation === "hosting" ? "purple" : "blue",
    statusTone: createStatusTone(party, isFinished),
    tabKeys
  };
}

/**
 * 生成人数头像占位文字。
 * @param confirmedCount 已确认人数
 * @returns 头像文字
 */
function createAvatars(confirmedCount: number): string[] {
  const count = Math.min(Math.max(confirmedCount, 3), 4);
  return AVATAR_NAMES.slice(0, count);
}

/**
 * 创建卡片右下角动作文案。
 * @param relation 当前用户与局的关系
 * @param isFinished 是否已结束
 * @returns 动作文案
 */
function createActionText(relation: PartyRelation, isFinished: boolean): string {
  if (isFinished) {
    return "已结束";
  }

  if (relation === "hosting") {
    return "我发起的";
  }

  return relation === "waitlist" ? "候补中" : "已报名";
}

/**
 * 创建状态标签色调。
 * @param party 局信息
 * @param isFinished 是否已结束
 * @returns 状态色调
 */
function createStatusTone(party: Party, isFinished: boolean): string {
  if (isFinished) {
    return "finished";
  }

  if (party.status === "full" || party.statusText.includes("报名")) {
    return "signup";
  }

  return "active";
}

/**
 * 拆分人数进度文案。
 * @param progressText 人数进度文案
 * @returns 当前人数和容量后缀
 */
function splitProgressText(progressText: string): { count: string; rest: string } {
  const match = progressText.match(/^([^/]+)\s*(\/\s*.+)$/);
  if (!match) {
    return {
      count: progressText,
      rest: ""
    };
  }

  return {
    count: match[1].trim(),
    rest: match[2].replace(/\s+/g, "")
  };
}

/**
 * 根据筛选标签过滤卡片。
 * @param parties 全量卡片
 * @param tabKey 当前筛选
 * @returns 过滤后的卡片
 */
function filterParties(parties: MyPartyCard[], tabKey: MyPartyTabKey): MyPartyCard[] {
  return parties.filter((party) => party.tabKeys.includes(tabKey));
}

/**
 * 统计未结束组局数量。
 * @param parties 全量卡片
 * @returns 未结束数量
 */
function countPending(parties: MyPartyCard[]): number {
  return parties.filter((party) => !party.isFinished).length;
}

/**
 * 统计去重后的组局数量。
 * @param groupedParties 我的组局分组
 * @returns 去重数量
 */
function countUniqueParties(groupedParties: MyPartyTabs<Party>): number {
  return new Set([
    ...groupedParties.hosting.map((item) => item.partyId),
    ...groupedParties.joined.map((item) => item.partyId),
    ...groupedParties.waitlist.map((item) => item.partyId),
    ...groupedParties.history.map((item) => item.partyId)
  ]).size;
}

/**
 * 创建空状态描述。
 * @param tabKey 当前筛选
 * @returns 空状态描述
 */
function createEmptyDescription(tabKey: MyPartyTabKey): string {
  const descriptionMap: Record<MyPartyTabKey, string> = {
    all: "发起或报名后，记录会集中出现在这里。",
    hosting: "还没有你发起的 K 局，先开一个好玩的局吧。",
    joined: "报名成功后，可以在这里管理行程。",
    history: "唱过的局会沉淀在这里，方便之后回看。"
  };

  return descriptionMap[tabKey];
}
