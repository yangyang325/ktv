const { AppError, ERROR_CODES, assertRequired } = require("../shared/errors");
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");

/**
 * 构建门店精确查询条件。
 * @param {{ district?: string, priceLevel?: string | number, venueId?: string }} filters 筛选条件
 * @returns {object} 可下推查询条件
 */
function buildVenueSelector(filters) {
  const selector = { isActive: true };

  if (filters.venueId) {
    selector.venueId = filters.venueId;
  }

  if (filters.district) {
    selector.district = filters.district;
  }

  if (filters.priceLevel !== undefined && filters.priceLevel !== null && filters.priceLevel !== "") {
    selector.priceLevel = Number(filters.priceLevel);
  }

  return selector;
}

/**
 * 判断门店是否符合本地补充筛选条件。
 * @param {object} venue 门店数据
 * @param {{ priceLevel?: string | number, keyword?: string }} filters 筛选条件
 * @returns {boolean} 是否匹配
 */
function matchesLocalFilters(venue, filters) {
  if (
    filters.priceLevel !== undefined &&
    filters.priceLevel !== null &&
    filters.priceLevel !== "" &&
    String(venue.priceLevel) !== String(filters.priceLevel)
  ) {
    return false;
  }

  if (filters.keyword) {
    const keyword = String(filters.keyword).toLowerCase();
    const searchableText = [venue.name, venue.district, venue.address].join(" ").toLowerCase();
    return searchableText.includes(keyword);
  }

  return true;
}

/**
 * 查询门店列表。
 * @param {{ district?: string, priceLevel?: string | number, keyword?: string }} payload 查询条件
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object[]>} 门店列表
 */
async function list(payload, runtime) {
  const venues = await runtime.store.list("venues", buildVenueSelector(payload));
  return venues.filter((venue) => matchesLocalFilters(venue, payload));
}

/**
 * 查询门店详情。
 * @param {{ venueId?: string }} payload 查询参数
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object>} 门店详情
 */
async function detail(payload, runtime) {
  assertRequired(payload.venueId, "venueId", "请选择门店");

  const venue = await runtime.store.findOne("venues", buildVenueSelector({ venueId: payload.venueId }));

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
