const { AppError, ERROR_CODES, assertRequired, assertCondition } = require("../shared/errors");
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");
const { buildPartyView } = require("../shared/party-view");

/**
 * 创建临时业务 ID。
 * @param {string} prefix ID 前缀
 * @returns {string} 临时业务 ID
 */
function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 获取当前登录用户。
 * @param {{ store: object, openid: string }} runtime 云函数运行时
 * @param {string | undefined} userId 指定用户 ID
 * @returns {Promise<object>} 当前用户
 */
async function getCurrentUser(runtime, userId) {
  const user = userId
    ? await runtime.store.findOne("users", { userId })
    : await runtime.store.findOne("users", { openid: runtime.openid });

  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  return user;
}

/**
 * 为组局附加前端展示字段。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {object} party 组局数据
 * @returns {Promise<object>} 前端展示组局数据
 */
async function attachPartyView(runtime, party) {
  const host = await runtime.store.findOne("users", { userId: party.hostId });
  const venue = party.venueId ? await runtime.store.findOne("venues", { venueId: party.venueId }) : null;

  return buildPartyView({ party, host, venue });
}

/**
 * 判断报名记录是否为有效记录。
 * @param {object} entry 报名记录
 * @returns {boolean} 是否有效
 */
function isActiveEntry(entry) {
  return entry.entryType === "confirmed" || entry.entryType === "waitlist";
}

/**
 * 查询可展示组局列表。
 * @param {Record<string, unknown>} payload 查询参数
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object[]>} 组局卡片列表
 */
async function list(payload, runtime) {
  const parties = await runtime.store.list("parties", (party) => party.status !== "finished" && party.status !== "cancelled");
  return Promise.all(parties.map((party) => attachPartyView(runtime, party)));
}

/**
 * 查询组局详情。
 * @param {{ partyId?: string, userId?: string }} payload 查询参数
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object>} 组局详情
 */
async function detail(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const party = await runtime.store.findOne("parties", { partyId: payload.partyId });

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  const host = await runtime.store.findOne("users", { userId: party.hostId });
  const entries = await runtime.store.list("entries", (entry) => entry.partyId === payload.partyId && isActiveEntry(entry));
  const confirmedEntries = entries
    .filter((entry) => entry.entryType === "confirmed")
    .sort((left, right) => (left.seqNo || 0) - (right.seqNo || 0));
  const waitlistEntries = entries
    .filter((entry) => entry.entryType === "waitlist")
    .sort((left, right) => (left.waitlistNo || 0) - (right.waitlistNo || 0));
  const viewerEntry = payload.userId ? entries.find((entry) => entry.userId === payload.userId) || null : null;

  return {
    party: await attachPartyView(runtime, party),
    host,
    confirmedEntries,
    waitlistEntries,
    viewerEntry
  };
}

/**
 * 查询我的组局分组。
 * @param {{ userId?: string }} payload 查询参数
 * @param {{ store: object, openid: string }} runtime 云函数运行时
 * @returns {Promise<{ hosting: object[], joined: object[], waitlist: object[], history: object[] }>} 我的组局分组
 */
async function myTabs(payload, runtime) {
  const currentUser = await getCurrentUser(runtime, payload.userId);
  const parties = await runtime.store.list("parties");
  const entries = await runtime.store.list("entries", (entry) => entry.userId === currentUser.userId && isActiveEntry(entry));
  const entryByPartyId = new Map(entries.map((entry) => [entry.partyId, entry]));
  const tabs = {
    hosting: [],
    joined: [],
    waitlist: [],
    history: []
  };

  for (const party of parties) {
    const isHistory = party.status === "finished" || party.status === "cancelled";
    const userEntry = entryByPartyId.get(party.partyId);

    if (party.hostId !== currentUser.userId && !userEntry) {
      continue;
    }

    const partyView = await attachPartyView(runtime, party);

    if (isHistory) {
      tabs.history.push(partyView);
    } else if (party.hostId === currentUser.userId) {
      tabs.hosting.push(partyView);
    } else if (userEntry.entryType === "confirmed") {
      tabs.joined.push(partyView);
    } else if (userEntry.entryType === "waitlist") {
      tabs.waitlist.push(partyView);
    }
  }

  return tabs;
}

/**
 * 创建组局草稿。
 * @param {object} payload 草稿表单
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 草稿组局展示数据
 */
async function createDraft(payload, runtime) {
  const currentUser = await getCurrentUser(runtime, payload.userId);
  const timestamp = runtime.now();

  assertRequired(payload.title, "title", "请填写局标题");
  assertRequired(payload.venueId, "venueId", "请选择门店");
  assertCondition(Number(payload.roomFee) >= 100, ERROR_CODES.VALIDATION_ERROR, "请填写有效包厢费用");
  assertCondition(Number(payload.maxCapacity) >= 2, ERROR_CODES.VALIDATION_ERROR, "至少需要 2 人成局");

  const party = await runtime.store.insert("parties", {
    partyId: createId("party"),
    title: payload.title,
    venueId: payload.venueId,
    venueCustom: payload.venueSummary || "",
    hostId: currentUser.userId,
    startTime: `${payload.startDate}T${payload.startTime}:00+08:00`,
    durationMin: Number(payload.durationMin) || 0,
    roomFee: Number(payload.roomFee),
    maxCapacity: Number(payload.maxCapacity),
    status: "draft",
    isPublic: false,
    notes: payload.notes || "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    coverImage: "/assets/images/ktv/ktv-room-01.jpg",
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null,
    confirmedCount: 1,
    waitlistCount: 0
  });

  await runtime.store.insert("entries", {
    entryId: createId("entry"),
    partyId: party.partyId,
    userId: currentUser.userId,
    userNickname: currentUser.nickname,
    entryType: "confirmed",
    seqNo: 1,
    waitlistNo: null,
    createdAt: timestamp,
    confirmedAt: timestamp
  });

  return attachPartyView(runtime, party);
}

/**
 * 发布组局草稿。
 * @param {{ partyId?: string }} payload 发布参数
 * @param {{ store: object, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 发布后的组局展示数据
 */
async function publish(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const timestamp = runtime.now();
  const party = await runtime.store.updateOne("parties", { partyId: payload.partyId }, () => ({
    status: "recruiting",
    updatedAt: timestamp,
    publishedAt: timestamp
  }));

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  return attachPartyView(runtime, party);
}

const handlers = {
  list,
  detail,
  myTabs,
  createDraft,
  publish
};

/**
 * 云函数入口。
 * @param {{ action?: string, payload?: Record<string, unknown> }} event 云函数入参
 * @param {object} context 云函数上下文
 * @returns {Promise<object>} 统一响应
 */
exports.main = async (event, context) => {
  return runAction(handlers, event, createRuntime(context));
};
