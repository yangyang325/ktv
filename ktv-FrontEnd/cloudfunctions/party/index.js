const { AppError, ERROR_CODES, assertRequired, assertCondition } = require("../shared/errors");
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");
const { buildPartyView } = require("../shared/party-view");

const VISIBLE_PARTY_STATUSES = new Set(["recruiting", "full", "closed"]);

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
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<object>} 当前用户
 */
async function getCurrentUser(runtime) {
  if (!runtime.hasExplicitOpenid) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  const user = await runtime.store.findOne("users", { openid: runtime.openid });

  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  return user;
}

/**
 * 查找已认证用户资料，不存在时返回空。
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<object | null>} 当前用户或空
 */
async function findAuthenticatedUser(runtime) {
  if (!runtime.hasExplicitOpenid) {
    return null;
  }

  return runtime.store.findOne("users", { openid: runtime.openid });
}

/**
 * 校验兼容传入的用户 ID 与登录身份一致。
 * @param {object} currentUser 当前登录用户
 * @param {string | undefined} userId 兼容传入的用户 ID
 */
function assertPayloadUserMatches(currentUser, userId) {
  if (userId && userId !== currentUser.userId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "登录身份与用户不匹配");
  }
}

/**
 * 判断开始日期是否为有效的 YYYY-MM-DD。
 * @param {string} startDate 开始日期
 * @returns {boolean} 是否有效
 */
function isValidStartDate(startDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * 判断开始时间是否为有效的 HH:mm。
 * @param {string} startTime 开始时间
 * @returns {boolean} 是否有效
 */
function isValidStartTime(startTime) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime);
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
  const parties = await runtime.store.list("parties", (party) => VISIBLE_PARTY_STATUSES.has(party.status));
  return Promise.all(parties.map((party) => attachPartyView(runtime, party)));
}

/**
 * 查询组局详情。
 * @param {{ partyId?: string, userId?: string }} payload 查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<object>} 组局详情
 */
async function detail(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const party = await runtime.store.findOne("parties", { partyId: payload.partyId });

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  const viewer = await findAuthenticatedUser(runtime);

  if (party.status === "draft" && (!viewer || viewer.userId !== party.hostId)) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "只有局主可以查看草稿");
  }

  const host = await runtime.store.findOne("users", { userId: party.hostId });
  const entries = (await runtime.store.list("entries", { partyId: payload.partyId })).filter(isActiveEntry);
  const confirmedEntries = entries
    .filter((entry) => entry.entryType === "confirmed")
    .sort((left, right) => (left.seqNo || 0) - (right.seqNo || 0));
  const waitlistEntries = entries
    .filter((entry) => entry.entryType === "waitlist")
    .sort((left, right) => (left.waitlistNo || 0) - (right.waitlistNo || 0));
  const viewerEntry = viewer ? entries.find((entry) => entry.userId === viewer.userId) || null : null;

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
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<{ hosting: object[], joined: object[], waitlist: object[], history: object[] }>} 我的组局分组
 */
async function myTabs(payload, runtime) {
  const currentUser = await getCurrentUser(runtime);
  assertPayloadUserMatches(currentUser, payload.userId);

  const parties = await runtime.store.list("parties");
  const entries = (await runtime.store.list("entries", { userId: currentUser.userId })).filter(isActiveEntry);
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
  const currentUser = await getCurrentUser(runtime);
  assertPayloadUserMatches(currentUser, payload.userId);

  const timestamp = runtime.now();

  assertRequired(payload.title, "title", "请填写局标题");
  assertRequired(payload.venueId, "venueId", "请选择门店");
  assertRequired(payload.startDate, "startDate", "请选择开始日期");
  assertRequired(payload.startTime, "startTime", "请选择开始时间");
  assertCondition(isValidStartDate(String(payload.startDate)), ERROR_CODES.VALIDATION_ERROR, "请选择有效开始日期");
  assertCondition(isValidStartTime(String(payload.startTime)), ERROR_CODES.VALIDATION_ERROR, "请选择有效开始时间");
  assertCondition(Number(payload.roomFee) >= 100, ERROR_CODES.VALIDATION_ERROR, "请填写有效包厢费用");
  assertCondition(Number(payload.maxCapacity) >= 2, ERROR_CODES.VALIDATION_ERROR, "至少需要 2 人成局");
  assertCondition(Number(payload.durationMin) > 0, ERROR_CODES.VALIDATION_ERROR, "请填写有效欢唱时长");

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
 * @param {{ partyId?: string, userId?: string }} payload 发布参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 发布后的组局展示数据
 */
async function publish(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const currentUser = await getCurrentUser(runtime);
  assertPayloadUserMatches(currentUser, payload.userId);

  const timestamp = runtime.now();
  const party = await runtime.store.findOne("parties", { partyId: payload.partyId });

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  if (party.hostId !== currentUser.userId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "只有局主可以发布组局");
  }

  assertCondition(party.status === "draft", ERROR_CODES.VALIDATION_ERROR, "只有草稿可以发布");

  const updatedParty = await runtime.store.updateOne("parties", { partyId: payload.partyId }, () => ({
    status: "recruiting",
    updatedAt: timestamp,
    publishedAt: timestamp
  }));

  return attachPartyView(runtime, updatedParty);
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
