const { AppError, ERROR_CODES, assertRequired } = require("../shared/errors");
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");

/**
 * 判断门店是否符合筛选条件。
 * @param {object} venue 门店数据
 * @param {{ district?: string, priceLevel?: string | number, keyword?: string }} filters 筛选条件
 * @returns {boolean} 是否匹配
 */
function matchesVenue(venue, filters) {
  if (!venue.isActive) {
    return false;
  }

  if (filters.district && venue.district !== filters.district) {
    return false;
  }

  if (filters.priceLevel !== undefined && filters.priceLevel !== null && String(venue.priceLevel) !== String(filters.priceLevel)) {
    return false;
  }

  if (filters.keyword) {
    const keyword = String(filters.keyword).toLowerCase();
    const searchableText = [venue.name, venue.district, venue.address].join(" ").toLowerCase();

    if (!searchableText.includes(keyword)) {
      return false;
    }
  }

  return true;
}

/**
 * 查询门店列表。
 * @param {{ district?: string, priceLevel?: string | number, keyword?: string }} payload 查询条件
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object[]>} 门店列表
 */
function list(payload, runtime) {
  return runtime.store.list("venues", (venue) => matchesVenue(venue, payload));
}

/**
 * 查询门店详情。
 * @param {{ venueId?: string }} payload 查询参数
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object>} 门店详情
 */
async function detail(payload, runtime) {
  assertRequired(payload.venueId, "venueId", "请选择门店");

  const venue = await runtime.store.findOne(
    "venues",
    (item) => item.venueId === payload.venueId && item.isActive
  );

  if (!venue) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "门店不存在");
  }

  return venue;
}

const handlers = {
  list,
  detail
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
