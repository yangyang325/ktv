const { AppError, ERROR_CODES, assertRequired } = require("./shared/errors");
const { createRuntime } = require("./shared/runtime");
const { runAction } = require("./shared/response");

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
 * @param {{ store: object }} runtime 云函数运行时
 * @param {string} partyId 组局 ID
 * @returns {Promise<object>} 组局数据
 */
async function getParty(runtime, partyId) {
  const party = await runtime.store.findOne("parties", { partyId });

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "组局不存在");
  }

  return party;
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
 * @param {{ partyId?: string, userId?: string }} payload 报名参数
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
    confirmedAt: timestamp
  });

  await refreshPartyCounts(runtime, party);

  return entry;
}

/**
 * 创建候补报名。
 * @param {{ partyId?: string, userId?: string }} payload 候补参数
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
    confirmedAt: null
  });

  await refreshPartyCounts(runtime, party);

  return entry;
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
  const entries = await listActiveEntries(runtime, party.partyId);
  const currentEntry = entries.find((entry) => entry.userId === currentUser.userId);

  if (!currentEntry) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "报名记录不存在");
  }

  const timestamp = runtime.now();
  let promotedEntry = null;

  await runtime.store.updateOne("entries", { entryId: currentEntry.entryId }, () => ({
    entryType: "quit",
    quitAt: timestamp
  }));

  if (currentEntry.entryType === "confirmed") {
    const firstWaitlistEntry = entries.filter((entry) => entry.entryType === "waitlist").sort(sortWaitlist)[0];

    if (firstWaitlistEntry) {
      promotedEntry = await runtime.store.updateOne("entries", { entryId: firstWaitlistEntry.entryId }, () => ({
        entryType: "confirmed",
        seqNo: currentEntry.seqNo,
        waitlistNo: null,
        confirmedAt: timestamp
      }));
    }
  }

  await reorderWaitlist(runtime, party.partyId);
  await refreshPartyCounts(runtime, party);

  return {
    quitEntryId: currentEntry.entryId,
    promotedEntry
  };
}

const handlers = {
  join,
  waitlist,
  quit
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
