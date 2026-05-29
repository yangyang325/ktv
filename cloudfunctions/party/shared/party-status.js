const LIST_VISIBLE_STATUSES = new Set(["recruiting", "full", "closed", "ongoing"]);
const TIME_LOCKED_STATUSES = new Set(["draft", "cancelled"]);

/**
 * 读取活动时间窗口。
 * @param {object} party 活动数据
 * @returns {{ startAt: number, endAt: number }} 活动开始和结束时间戳
 */
function getPartyTimeWindow(party) {
  const startAt = new Date(party.startTime).getTime();
  const durationMin = Number(party.durationMin) || 0;
  return {
    startAt,
    endAt: startAt + durationMin * 60 * 1000
  };
}

/**
 * 判断活动人数是否已满。
 * @param {object} party 活动数据
 * @returns {boolean} 是否已满员
 */
function isPartyAtCapacity(party) {
  return Number(party.confirmedCount) >= Number(party.maxCapacity);
}

/**
 * 判断当前时间是否早于活动开始时间。
 * @param {object} party 活动数据
 * @param {string} nowISOString 当前时间
 * @returns {boolean} 是否早于开始时间
 */
function isPartyBeforeStart(party, nowISOString) {
  const { startAt } = getPartyTimeWindow(party);
  const nowAt = new Date(nowISOString).getTime();

  return Number.isFinite(startAt) && Number.isFinite(nowAt) && nowAt < startAt;
}

/**
 * 根据当前时间解析活动实时状态。
 * @param {object} party 活动数据
 * @param {string} nowISOString 当前时间
 * @returns {string} 实时活动状态
 */
function resolveTimedPartyStatus(party, nowISOString) {
  if (TIME_LOCKED_STATUSES.has(party.status)) {
    return party.status;
  }

  const { startAt, endAt } = getPartyTimeWindow(party);
  const nowAt = new Date(nowISOString).getTime();

  if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || !Number.isFinite(nowAt)) {
    return party.status;
  }

  if (nowAt >= endAt) {
    return "finished";
  }

  if (nowAt >= startAt) {
    return "ongoing";
  }

  return party.status;
}

/**
 * 同步活动实时状态到存储。
 * @param {{ store: object, now: Function }} runtime 云函数运行时
 * @param {object} party 活动数据
 * @returns {Promise<object>} 同步后的活动数据
 */
async function syncPartyTimedStatus(runtime, party) {
  const timestamp = runtime.now();
  const nextStatus = resolveTimedPartyStatus(party, timestamp);

  if (nextStatus === party.status) {
    return party;
  }

  return runtime.store.updateOne("parties", { partyId: party.partyId }, () => ({
    status: nextStatus,
    updatedAt: timestamp
  }));
}

/**
 * 判断活动是否应该出现在普通活动列表。
 * @param {object} party 活动数据
 * @returns {boolean} 是否列表可见
 */
function isPartyVisibleInList(party) {
  return LIST_VISIBLE_STATUSES.has(party.status);
}

module.exports = {
  getPartyTimeWindow,
  isPartyAtCapacity,
  isPartyBeforeStart,
  resolveTimedPartyStatus,
  syncPartyTimedStatus,
  isPartyVisibleInList
};
