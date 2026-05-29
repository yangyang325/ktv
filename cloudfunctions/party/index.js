const crypto = require("node:crypto");

const { AppError, ERROR_CODES, assertRequired, assertCondition } = require("./shared/errors");
const { createRuntime } = require("./shared/runtime");
const { runAction } = require("./shared/response");
const { buildPartyView } = require("./shared/party-view");
const { selectRandomPartyCoverImage } = require("./shared/assets");
const {
  isPartyAtCapacity,
  isPartyBeforeStart,
  isPartyVisibleInList,
  syncPartyTimedStatus
} = require("./shared/party-status");

const MIN_PARTY_START_LEAD_MS = 5 * 60 * 1000;

/**
 * 创建临时业务 ID。
 * @param {string} prefix ID 前缀
 * @returns {string} 临时业务 ID
 */
function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 根据 openid 构建稳定用户 ID。
 * @param {string} openid 微信 openid
 * @returns {string} 用户 ID
 */
function buildUserId(openid) {
  return `user-${crypto.createHash("sha256").update(openid).digest("hex").slice(0, 24)}`;
}

/**
 * 规范化组局封面图片。
 * @param {unknown} coverImage 封面图片地址
 * @returns {string} 可保存的封面图片地址
 */
function normalizeCoverImage(coverImage) {
  if (typeof coverImage !== "string") {
    return selectRandomPartyCoverImage();
  }

  const trimmedCoverImage = coverImage.trim();
  return trimmedCoverImage || selectRandomPartyCoverImage();
}

/**
 * 规范化导航坐标。
 * @param {unknown} coordinate 坐标值
 * @returns {number | undefined} 可保存的坐标
 */
function normalizeCoordinate(coordinate) {
  const coordinateValue = Number(coordinate);
  return Number.isFinite(coordinateValue) ? coordinateValue : undefined;
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
 * 确保收藏动作有当前登录用户资料。
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 当前用户
 */
async function ensureFavoriteUser(runtime) {
  const currentUser = await findAuthenticatedUser(runtime);

  if (currentUser) {
    return currentUser;
  }

  if (!runtime.hasExplicitOpenid) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  const timestamp = runtime.now();
  return runtime.store.insert("users", {
    userId: buildUserId(runtime.openid),
    openid: runtime.openid,
    nickname: "微信用户",
    avatarUrl: "",
    createdAt: timestamp,
    updatedAt: timestamp
  });
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
 * 查询可收藏的活动。
 * @param {string} partyId 活动 ID
 * @param {{ store: object, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 活动数据
 */
async function findFavoriteParty(partyId, runtime) {
  assertRequired(partyId, "partyId", "请选择收藏活动");

  const party = await runtime.store.findOne("parties", { partyId });

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "活动不存在");
  }

  return syncPartyTimedStatus(runtime, party);
}

/**
 * 校验当前用户是否可以操作活动收藏。
 * @param {object} party 活动数据
 * @param {object | null} currentUser 当前用户
 */
function assertCanFavoriteParty(party, currentUser) {
  if (party.status === "draft" && (!currentUser || currentUser.userId !== party.hostId)) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "只有发起人可以收藏草稿活动");
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
 * 构建活动开始时间文本。
 * @param {string} startDate 开始日期
 * @param {string} startTime 开始时间
 * @returns {string} 带时区的开始时间文本
 */
function buildPartyStartTime(startDate, startTime) {
  return `${startDate}T${startTime}:00+08:00`;
}

/**
 * 校验活动开始时间是否晚于当前时间 5 分钟。
 * @param {string} startTime 活动开始时间
 * @param {string} nowISOString 当前时间
 */
function assertPartyStartAfterMinimumLead(startTime, nowISOString) {
  const startAt = new Date(startTime).getTime();
  const nowAt = new Date(nowISOString).getTime();

  assertCondition(
    Number.isFinite(startAt) && Number.isFinite(nowAt) && startAt > nowAt + MIN_PARTY_START_LEAD_MS,
    ERROR_CODES.VALIDATION_ERROR,
    "活动开始时间需晚于当前时间 5 分钟"
  );
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
  const partyView = buildPartyView({ party, host, venue });

  return attachParticipantAvatars(runtime, partyView);
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
 * 为组局展示数据附加真实报名人头像。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {object} partyView 组局展示数据
 * @returns {Promise<object>} 附加头像后的组局展示数据
 */
async function attachParticipantAvatars(runtime, partyView) {
  return {
    ...partyView,
    participantAvatars: await buildParticipantAvatars(runtime, partyView.partyId)
  };
}

/**
 * 根据确认报名记录构建头像列表。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {string} partyId 组局 ID
 * @returns {Promise<object[]>} 报名人头像列表
 */
async function buildParticipantAvatars(runtime, partyId) {
  const entries = (await runtime.store.list("entries", { partyId }))
    .filter((entry) => entry.entryType === "confirmed")
    .sort((left, right) => (left.seqNo || 0) - (right.seqNo || 0))
    .slice(0, 3);
  const avatars = [];

  for (const entry of entries) {
    const user = await runtime.store.findOne("users", { userId: entry.userId });
    if (!user || !user.avatarUrl) {
      continue;
    }

    avatars.push({
      userId: user.userId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl
    });
  }

  return avatars;
}

/**
 * 根据查看身份脱敏报名联系信息。
 * @param {object} entry 报名记录
 * @param {boolean} canViewContact 是否可查看联系信息
 * @returns {object} 脱敏后的报名记录
 */
function sanitizeEntryContact(entry, canViewContact) {
  if (canViewContact) {
    return entry;
  }

  const { contactInfo, ...safeEntry } = entry;
  return safeEntry;
}

/**
 * 给报名记录补充报名用户资料。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {object[]} entries 报名记录列表
 * @returns {Promise<object[]>} 补充用户头像和性别后的报名记录
 */
async function attachEntryUserProfiles(runtime, entries) {
  return Promise.all(
    entries.map(async (entry) => {
      const user = await runtime.store.findOne("users", { userId: entry.userId });
      return {
        ...entry,
        userAvatarUrl: user?.avatarUrl || "",
        userGender: user?.gender || "保密"
      };
    })
  );
}

/**
 * 查询可展示组局列表。
 * @param {Record<string, unknown>} payload 查询参数
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object[]>} 组局卡片列表
 */
async function list(payload, runtime) {
  const parties = await runtime.store.list("parties");
  const visibleParties = [];

  for (const party of parties) {
    const timedParty = await syncPartyTimedStatus(runtime, party);
    if (isPartyVisibleInList(timedParty)) {
      visibleParties.push(timedParty);
    }
  }

  return Promise.all(visibleParties.map((party) => attachPartyView(runtime, party)));
}

/**
 * 查询活动详情。
 * @param {{ partyId?: string, userId?: string }} payload 查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<object>} 活动详情
 */
async function detail(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const foundParty = await runtime.store.findOne("parties", { partyId: payload.partyId });

  if (!foundParty) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  const party = await syncPartyTimedStatus(runtime, foundParty);
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
  const canViewContacts = Boolean(viewer && viewer.userId === party.hostId);
  const viewerEntry = viewer ? entries.find((entry) => entry.userId === viewer.userId) || null : null;
  const confirmedEntriesWithProfiles = await attachEntryUserProfiles(runtime, confirmedEntries);
  const waitlistEntriesWithProfiles = await attachEntryUserProfiles(runtime, waitlistEntries);
  const viewerEntryWithProfile = viewerEntry ? (await attachEntryUserProfiles(runtime, [viewerEntry]))[0] : null;

  return {
    party: await attachPartyView(runtime, party),
    host,
    confirmedEntries: confirmedEntriesWithProfiles.map((entry) => sanitizeEntryContact(entry, canViewContacts)),
    waitlistEntries: waitlistEntriesWithProfiles.map((entry) => sanitizeEntryContact(entry, canViewContacts)),
    viewerEntry: viewerEntryWithProfile ? sanitizeEntryContact(viewerEntryWithProfile, canViewContacts) : null,
    canViewContacts
  };
}

/**
 * 查询我的活动分组。
 * @param {{ userId?: string }} payload 查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<{ hosting: object[], joined: object[], waitlist: object[], history: object[] }>} 我的活动分组
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
    const timedParty = await syncPartyTimedStatus(runtime, party);
    const isHistory = timedParty.status === "finished" || timedParty.status === "cancelled";
    const userEntry = entryByPartyId.get(timedParty.partyId);

    if (timedParty.hostId !== currentUser.userId && !userEntry) {
      continue;
    }

    const partyView = await attachPartyView(runtime, timedParty);

    if (isHistory) {
      tabs.history.push(partyView);
    } else if (timedParty.hostId === currentUser.userId) {
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
 * 查询当前用户是否已收藏活动。
 * @param {{ partyId?: string, userId?: string }} payload 收藏查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<{ partyId: string, isFavorited: boolean }>} 收藏状态
 */
async function favoriteStatus(payload, runtime) {
  const party = await findFavoriteParty(payload.partyId, runtime);
  const currentUser = await findAuthenticatedUser(runtime);
  assertCanFavoriteParty(party, currentUser);

  if (!currentUser) {
    return {
      partyId: party.partyId,
      isFavorited: false
    };
  }

  assertPayloadUserMatches(currentUser, payload.userId);

  const favorites = await runtime.store.list("favorites", {
    userId: currentUser.userId,
    partyId: party.partyId
  });

  return {
    partyId: party.partyId,
    isFavorited: favorites.some((favorite) => favorite.active)
  };
}

/**
 * 切换当前用户的活动收藏状态。
 * @param {{ partyId?: string, userId?: string }} payload 收藏切换参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean, now: Function }} runtime 云函数运行时
 * @returns {Promise<{ partyId: string, isFavorited: boolean }>} 切换后的收藏状态
 */
async function favoriteToggle(payload, runtime) {
  const party = await findFavoriteParty(payload.partyId, runtime);
  const currentUser = await ensureFavoriteUser(runtime);
  assertPayloadUserMatches(currentUser, payload.userId);
  assertCanFavoriteParty(party, currentUser);

  const timestamp = runtime.now();
  const favorite = await runtime.store.findOne("favorites", {
    userId: currentUser.userId,
    partyId: party.partyId
  });

  if (favorite) {
    const isFavorited = !favorite.active;
    await runtime.store.updateOne("favorites", { favoriteId: favorite.favoriteId }, () => ({
      active: isFavorited,
      updatedAt: timestamp
    }));

    return {
      partyId: party.partyId,
      isFavorited
    };
  }

  await runtime.store.insert("favorites", {
    favoriteId: createId("favorite"),
    userId: currentUser.userId,
    partyId: party.partyId,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return {
    partyId: party.partyId,
    isFavorited: true
  };
}

/**
 * 查询当前用户收藏的活动列表。
 * @param {{ userId?: string }} payload 收藏列表参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean, now: Function }} runtime 云函数运行时
 * @returns {Promise<object[]>} 收藏活动列表
 */
async function favoriteList(payload, runtime) {
  const currentUser = await ensureFavoriteUser(runtime);
  assertPayloadUserMatches(currentUser, payload.userId);

  const favorites = (await runtime.store.list("favorites", { userId: currentUser.userId, active: true })).sort(
    (left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""))
  );
  const seenPartyIds = new Set();
  const parties = [];

  for (const favorite of favorites) {
    if (seenPartyIds.has(favorite.partyId)) {
      continue;
    }

    seenPartyIds.add(favorite.partyId);
    const foundParty = await runtime.store.findOne("parties", { partyId: favorite.partyId });

    if (!foundParty) {
      continue;
    }

    const party = await syncPartyTimedStatus(runtime, foundParty);

    if (party.status === "draft") {
      if (party.hostId === currentUser.userId) {
        parties.push(await attachPartyView(runtime, party));
      }
      continue;
    }

    if (isPartyVisibleInList(party)) {
      parties.push(await attachPartyView(runtime, party));
    }
  }

  return parties;
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

  assertRequired(payload.title, "title", "请填写活动标题");
  assertRequired(payload.venueId, "venueId", "请选择K歌活动地点");
  assertRequired(payload.venueSummary, "venueSummary", "请选择K歌活动地点位置");
  assertRequired(payload.startDate, "startDate", "请选择开始日期");
  assertRequired(payload.startTime, "startTime", "请选择开始时间");
  assertCondition(isValidStartDate(String(payload.startDate)), ERROR_CODES.VALIDATION_ERROR, "请选择有效开始日期");
  assertCondition(isValidStartTime(String(payload.startTime)), ERROR_CODES.VALIDATION_ERROR, "请选择有效开始时间");
  assertCondition(Number(payload.roomFee) >= 100, ERROR_CODES.VALIDATION_ERROR, "请填写有效包厢费用");
  assertCondition(Number(payload.maxCapacity) >= 2, ERROR_CODES.VALIDATION_ERROR, "至少需要 2 人成局");
  assertCondition(Number(payload.durationMin) > 0, ERROR_CODES.VALIDATION_ERROR, "请填写有效欢唱时长");

  const partyStartTime = buildPartyStartTime(payload.startDate, payload.startTime);
  assertPartyStartAfterMinimumLead(partyStartTime, timestamp);

  const party = await runtime.store.insert("parties", {
    partyId: createId("party"),
    title: payload.title,
    venueId: payload.venueId,
    venueCustom: payload.venueSummary || "",
    hostId: currentUser.userId,
    startTime: partyStartTime,
    durationMin: Number(payload.durationMin) || 0,
    roomFee: Number(payload.roomFee),
    maxCapacity: Number(payload.maxCapacity),
    status: "draft",
    isPublic: false,
    notes: payload.notes || "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    coverImage: normalizeCoverImage(payload.coverImage),
    venueAddress: typeof payload.venueAddress === "string" ? payload.venueAddress : "",
    venueLatitude: normalizeCoordinate(payload.venueLatitude),
    venueLongitude: normalizeCoordinate(payload.venueLongitude),
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
 * 发布活动草稿。
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
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "只有发起人可以发布活动");
  }

  assertCondition(party.status === "draft", ERROR_CODES.VALIDATION_ERROR, "只有草稿可以发布");
  assertPartyStartAfterMinimumLead(party.startTime, timestamp);

  const updatedParty = await runtime.store.updateOne("parties", { partyId: payload.partyId }, () => ({
    status: "recruiting",
    updatedAt: timestamp,
    publishedAt: timestamp
  }));

  return attachPartyView(runtime, updatedParty);
}

/**
 * 校验活动状态切换目标。
 * @param {unknown} targetStatus 目标状态
 * @returns {string} 目标状态
 */
function normalizeStatusSwitchTarget(targetStatus) {
  assertRequired(targetStatus, "targetStatus", "请选择活动状态");
  assertCondition(
    targetStatus === "recruiting" || targetStatus === "finished",
    ERROR_CODES.VALIDATION_ERROR,
    "请选择有效活动状态"
  );

  return targetStatus;
}

/**
 * 校验已结束活动能否恢复报名。
 * @param {object} party 活动数据
 * @param {string} nowISOString 当前时间
 */
function assertCanRestoreRecruiting(party, nowISOString) {
  if (party.status === "ongoing") {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "活动中不能恢复报名");
  }

  assertCondition(party.status === "finished", ERROR_CODES.VALIDATION_ERROR, "只有已结束的活动可以恢复报名");

  if (isPartyAtCapacity(party)) {
    throw new AppError(ERROR_CODES.PARTY_FULL, "报名人数已满，不能恢复报名");
  }

  assertCondition(isPartyBeforeStart(party, nowISOString), ERROR_CODES.VALIDATION_ERROR, "活动已经开始，不能恢复报名");
}

/**
 * 切换发起人维护的活动报名状态。
 * @param {{ partyId?: string, targetStatus?: string, userId?: string }} payload 状态切换参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 切换后的组局展示数据
 */
async function statusSwitch(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const targetStatus = normalizeStatusSwitchTarget(payload.targetStatus);
  const currentUser = await getCurrentUser(runtime);
  assertPayloadUserMatches(currentUser, payload.userId);

  const foundParty = await runtime.store.findOne("parties", { partyId: payload.partyId });
  if (!foundParty) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  const party = await syncPartyTimedStatus(runtime, foundParty);
  if (party.hostId !== currentUser.userId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "只有发起人可以调整活动状态");
  }

  const timestamp = runtime.now();
  if (targetStatus === "finished") {
    assertCondition(party.status === "recruiting", ERROR_CODES.VALIDATION_ERROR, "只有报名中的活动可以结束报名");
  } else {
    assertCanRestoreRecruiting(party, timestamp);
  }

  const updatedParty = await runtime.store.updateOne("parties", { partyId: party.partyId }, () => ({
    status: targetStatus,
    updatedAt: timestamp
  }));

  return attachPartyView(runtime, updatedParty);
}

const handlers = {
  list,
  detail,
  myTabs,
  favoriteStatus,
  favoriteToggle,
  favoriteList,
  createDraft,
  publish,
  statusSwitch
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
