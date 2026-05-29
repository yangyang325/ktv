const { AppError, ERROR_CODES, assertRequired } = require("./shared/errors");
const { createRuntime } = require("./shared/runtime");
const { runAction } = require("./shared/response");
const { syncPartyTimedStatus } = require("./shared/party-status");

const CONTACT_METHODS = new Set(["wechat", "phone"]);

/**
 * 创建临时业务 ID。
 * @param {string} prefix ID 前缀
 * @returns {string} 临时业务 ID
 */
function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
 * 规范化可选联系文本。
 * @param {unknown} value 原始文本
 * @param {number} maxLength 最大长度
 * @returns {string} 规范化文本
 */
function normalizeOptionalText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

/**
 * 规范化单次报名联系信息。
 * @param {unknown} contactInfo 原始联系信息
 * @returns {{ method: string, value: string, arrivalTime?: string, note?: string }} 联系信息
 */
function normalizeContactInfo(contactInfo) {
  if (!contactInfo || typeof contactInfo !== "object") {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "请填写入群联系信息");
  }

  const method = CONTACT_METHODS.has(contactInfo.method) ? contactInfo.method : "";
  const value = normalizeOptionalText(contactInfo.value, 40);
  const arrivalTime = normalizeOptionalText(contactInfo.arrivalTime, 20);
  const note = normalizeOptionalText(contactInfo.note, 80);

  if (!method || !value) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "请填写入群联系信息");
  }

  return {
    method,
    value,
    ...(arrivalTime ? { arrivalTime } : {}),
    ...(note ? { note } : {})
  };
}

/**
 * 获取当前登录用户并校验传入用户 ID。
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @param {string | undefined} userId 兼容传入的用户 ID
 * @returns {Promise<object>} 当前用户
 */
async function getCurrentUser(runtime, userId) {
  if (!runtime.hasExplicitOpenid) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  const user = await runtime.store.findOne("users", { openid: runtime.openid });

  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  if (userId && userId !== user.userId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "登录身份与用户不匹配");
  }

  return user;
}

/**
 * 获取组局数据。
 * @param {{ store: object, now: Function }} runtime 云函数运行时
 * @param {string} partyId 组局 ID
 * @returns {Promise<object>} 组局数据
 */
async function getParty(runtime, partyId) {
  const party = await runtime.store.findOne("parties", { partyId });

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  return syncPartyTimedStatus(runtime, party);
}

/**
 * 查询组局有效报名记录。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {string} partyId 组局 ID
 * @returns {Promise<object[]>} 有效报名记录
 */
async function listActiveEntries(runtime, partyId) {
  const entries = await runtime.store.list("entries", { partyId });
  return entries.filter(isActiveEntry);
}

/**
 * 校验用户没有重复有效报名。
 * @param {object[]} entries 有效报名记录
 * @param {string} userId 用户 ID
 */
function assertNoActiveEntry(entries, userId) {
  if (entries.some((entry) => entry.userId === userId)) {
    throw new AppError(ERROR_CODES.DUPLICATE_ENTRY, "你已报名该组局");
  }
}

/**
 * 计算有效确认人数。
 * @param {object} party 组局数据
 * @param {object[]} entries 有效报名记录
 * @returns {number} 确认人数
 */
function countConfirmedEntries(party, entries) {
  const confirmedCount = entries.filter((entry) => entry.entryType === "confirmed").length;
  const hasHostEntry = entries.some((entry) => entry.userId === party.hostId);
  return confirmedCount + (hasHostEntry ? 0 : 1);
}

/**
 * 计算下一个确认序号。
 * @param {object} party 组局数据
 * @param {object[]} entries 有效报名记录
 * @returns {number} 下一个确认序号
 */
function getNextConfirmedSeqNo(party, entries) {
  const seqNos = entries.filter((entry) => entry.entryType === "confirmed").map((entry) => Number(entry.seqNo) || 0);
  const fallbackHostSeq = entries.some((entry) => entry.userId === party.hostId) ? 0 : 1;
  return Math.max(fallbackHostSeq, ...seqNos, 0) + 1;
}

/**
 * 根据候补序号和创建时间排序。
 * @param {object} left 左侧报名
 * @param {object} right 右侧报名
 * @returns {number} 排序结果
 */
function sortWaitlist(left, right) {
  const leftNo = Number(left.waitlistNo) || Number.MAX_SAFE_INTEGER;
  const rightNo = Number(right.waitlistNo) || Number.MAX_SAFE_INTEGER;

  if (leftNo !== rightNo) {
    return leftNo - rightNo;
  }

  return String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
}

/**
 * 重新整理候补序号。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {string} partyId 组局 ID
 * @returns {Promise<object[]>} 整理后的候补记录
 */
async function reorderWaitlist(runtime, partyId) {
  const waitlistEntries = (await listActiveEntries(runtime, partyId))
    .filter((entry) => entry.entryType === "waitlist")
    .sort(sortWaitlist);
  const reordered = [];

  for (let index = 0; index < waitlistEntries.length; index += 1) {
    const entry = waitlistEntries[index];
    const waitlistNo = index + 1;

    if (entry.waitlistNo === waitlistNo) {
      reordered.push(entry);
      continue;
    }

    const updated = await runtime.store.updateOne("entries", { entryId: entry.entryId }, () => ({ waitlistNo }));
    reordered.push(updated);
  }

  return reordered;
}

/**
 * 更新组局报名统计。
 * @param {{ store: object, now: Function }} runtime 云函数运行时
 * @param {object} party 组局数据
 * @returns {Promise<object>} 更新后的组局
 */
async function refreshPartyCounts(runtime, party) {
  const entries = await listActiveEntries(runtime, party.partyId);
  const confirmedCount = countConfirmedEntries(party, entries);
  const waitlistCount = entries.filter((entry) => entry.entryType === "waitlist").length;
  let status = party.status;

  if (status === "full" && confirmedCount < Number(party.maxCapacity)) {
    status = "recruiting";
  } else if (status === "recruiting" && confirmedCount >= Number(party.maxCapacity)) {
    status = "full";
  }

  return runtime.store.updateOne("parties", { partyId: party.partyId }, () => ({
    confirmedCount,
    waitlistCount,
    status,
    updatedAt: runtime.now()
  }));
}

/**
 * 创建确认报名。
 * @param {{ partyId?: string, userId?: string, contactInfo?: object }} payload 报名参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 报名记录
 */
async function join(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const currentUser = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);

  if (party.status !== "recruiting") {
    throw new AppError(
      party.status === "full" ? ERROR_CODES.PARTY_FULL : ERROR_CODES.PARTY_NOT_RECRUITING,
      party.status === "full" ? "组局已满员" : "组局暂不可报名"
    );
  }

  const entries = await listActiveEntries(runtime, party.partyId);
  assertNoActiveEntry(entries, currentUser.userId);

  if (countConfirmedEntries(party, entries) >= Number(party.maxCapacity)) {
    throw new AppError(ERROR_CODES.PARTY_FULL, "组局已满员");
  }

  const contactInfo = normalizeContactInfo(payload.contactInfo);
  const timestamp = runtime.now();
  const entry = await runtime.store.insert("entries", {
    entryId: createId("entry"),
    partyId: party.partyId,
    userId: currentUser.userId,
    userNickname: currentUser.nickname,
    entryType: "confirmed",
    seqNo: getNextConfirmedSeqNo(party, entries),
    waitlistNo: null,
    createdAt: timestamp,
    confirmedAt: timestamp,
    contactInfo
  });

  await refreshPartyCounts(runtime, party);

  return entry;
}

/**
 * 创建候补报名。
 * @param {{ partyId?: string, userId?: string, contactInfo?: object }} payload 候补参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 候补报名记录
 */
async function waitlist(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const currentUser = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);

  if (party.status !== "recruiting" && party.status !== "full") {
    throw new AppError(ERROR_CODES.PARTY_NOT_RECRUITING, "组局暂不可候补");
  }

  const entries = await listActiveEntries(runtime, party.partyId);
  assertNoActiveEntry(entries, currentUser.userId);

  const contactInfo = normalizeContactInfo(payload.contactInfo);
  const waitlistEntries = entries.filter((entry) => entry.entryType === "waitlist");
  const nextWaitlistNo = Math.max(0, ...waitlistEntries.map((entry) => Number(entry.waitlistNo) || 0)) + 1;
  const entry = await runtime.store.insert("entries", {
    entryId: createId("entry"),
    partyId: party.partyId,
    userId: currentUser.userId,
    userNickname: currentUser.nickname,
    entryType: "waitlist",
    seqNo: null,
    waitlistNo: nextWaitlistNo,
    createdAt: runtime.now(),
    confirmedAt: null,
    contactInfo
  });

  await refreshPartyCounts(runtime, party);

  return entry;
}

/**
 * 将有效报名记录标记为退出或移除并在需要时晋升候补。
 * @param {{ store: object, now: Function }} runtime 云函数运行时
 * @param {object} party 组局数据
 * @param {object[]} entries 有效报名记录
 * @param {object} targetEntry 目标报名记录
 * @param {{ entryType: "quit" | "removed", timeField: string, shouldPromoteWaitlist?: boolean }} options 标记选项
 * @returns {Promise<object | null>} 被晋升的候补记录
 */
async function markEntryInactive(runtime, party, entries, targetEntry, options) {
  const timestamp = runtime.now();
  let promotedEntry = null;

  await runtime.store.updateOne("entries", { entryId: targetEntry.entryId }, () => ({
    entryType: options.entryType,
    [options.timeField]: timestamp
  }));

  if (targetEntry.entryType === "confirmed" && options.shouldPromoteWaitlist !== false) {
    const firstWaitlistEntry = entries.filter((entry) => entry.entryType === "waitlist").sort(sortWaitlist)[0];

    if (firstWaitlistEntry) {
      promotedEntry = await runtime.store.updateOne("entries", { entryId: firstWaitlistEntry.entryId }, () => ({
        entryType: "confirmed",
        seqNo: targetEntry.seqNo,
        waitlistNo: null,
        confirmedAt: timestamp
      }));
    }
  }

  await reorderWaitlist(runtime, party.partyId);
  await refreshPartyCounts(runtime, party);

  return promotedEntry;
}

/**
 * 退出报名并在需要时晋升候补。
 * @param {{ partyId?: string, userId?: string }} payload 退出参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<{ quitEntryId: string, promotedEntry: object | null }>} 退出结果
 */
async function quit(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");

  const currentUser = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);

  if (party.hostId === currentUser.userId) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "发起人不能退出自己的活动报名");
  }

  const entries = await listActiveEntries(runtime, party.partyId);
  const currentEntry = entries.find((entry) => entry.userId === currentUser.userId);

  if (!currentEntry) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "报名记录不存在");
  }

  const promotedEntry = await markEntryInactive(runtime, party, entries, currentEntry, {
    entryType: "quit",
    timeField: "quitAt"
  });

  return {
    quitEntryId: currentEntry.entryId,
    promotedEntry
  };
}

/**
 * 发起人移除报名者并在需要时晋升候补。
 * @param {{ partyId?: string, entryId?: string, userId?: string }} payload 移除参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<{ removedEntryId: string, promotedEntry: object | null }>} 移除结果
 */
async function remove(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");
  assertRequired(payload.entryId, "entryId", "请选择报名者");

  const currentUser = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);

  if (party.hostId !== currentUser.userId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "只有发起人可以移除报名者");
  }

  const entries = await listActiveEntries(runtime, party.partyId);
  const targetEntry = entries.find((entry) => entry.entryId === payload.entryId);

  if (!targetEntry) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "报名记录不存在");
  }

  if (targetEntry.userId === party.hostId) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "不能移除发起人");
  }

  const promotedEntry = await markEntryInactive(runtime, party, entries, targetEntry, {
    entryType: "removed",
    timeField: "removedAt",
    shouldPromoteWaitlist: false
  });

  return {
    removedEntryId: targetEntry.entryId,
    promotedEntry
  };
}

/**
 * 发起人将候补报名调整为正式成员。
 * @param {{ partyId?: string, entryId?: string, userId?: string }} payload 转正参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<{ promotedEntry: object }>} 转正结果
 */
async function promoteWaitlist(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "请选择组局");
  assertRequired(payload.entryId, "entryId", "请选择候补报名者");

  const currentUser = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);

  if (party.hostId !== currentUser.userId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "只有发起人可以调整名单");
  }

  if (party.status !== "recruiting" && party.status !== "full") {
    throw new AppError(ERROR_CODES.PARTY_NOT_RECRUITING, "组局暂不可调整名单");
  }

  const entries = await listActiveEntries(runtime, party.partyId);
  const targetEntry = entries.find((entry) => entry.entryId === payload.entryId);

  if (!targetEntry) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "候补记录不存在");
  }

  if (targetEntry.entryType !== "waitlist") {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "请选择候补报名者");
  }

  if (countConfirmedEntries(party, entries) >= Number(party.maxCapacity)) {
    throw new AppError(ERROR_CODES.PARTY_FULL, "报名人数已满，请先移除一名正式报名者");
  }

  const timestamp = runtime.now();
  const promotedEntry = await runtime.store.updateOne("entries", { entryId: targetEntry.entryId }, () => ({
    entryType: "confirmed",
    seqNo: getNextConfirmedSeqNo(party, entries),
    waitlistNo: null,
    confirmedAt: timestamp
  }));

  await reorderWaitlist(runtime, party.partyId);
  await refreshPartyCounts(runtime, party);

  return {
    promotedEntry
  };
}

const handlers = {
  join,
  waitlist,
  quit,
  remove,
  promoteWaitlist
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
