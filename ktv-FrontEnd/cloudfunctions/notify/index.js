const { AppError, ERROR_CODES, assertRequired } = require("../shared/errors");
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");

/**
 * 创建临时业务 ID。
 * @param {string} prefix ID 前缀
 * @returns {string} 临时业务 ID
 */
function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 获取当前登录用户并校验传入用户 ID。
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @param {string | undefined} userId 兼容传入的用户 ID
 * @returns {Promise<object>} 当前用户
 */
async function getUser(runtime, userId) {
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
 * 创建通知。
 * @param {{ userId?: string, title?: string, type?: string, content?: string, partyId?: string, entryId?: string }} payload 通知参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 通知记录
 */
async function create(payload, runtime) {
  assertRequired(payload.userId, "userId", "请选择接收用户");
  assertRequired(payload.title, "title", "请填写通知标题");

  const user = await getUser(runtime, payload.userId);
  const notification = {
    notificationId: createId("notification"),
    userId: user.userId,
    type: payload.type || "system",
    title: payload.title,
    content: payload.content || "",
    partyId: payload.partyId || "",
    entryId: payload.entryId || "",
    read: false,
    createdAt: runtime.now(),
    readAt: null
  };

  return runtime.store.insert("notifications", notification);
}

/**
 * 查询当前用户通知列表。
 * @param {{ userId?: string }} payload 查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<object[]>} 通知列表
 */
async function list(payload, runtime) {
  const user = await getUser(runtime, payload.userId);
  const notifications = await runtime.store.list("notifications", { userId: user.userId });

  return notifications.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

/**
 * 标记当前用户通知已读。
 * @param {{ userId?: string, notificationId?: string }} payload 已读参数
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<object>} 更新后的通知
 */
async function markRead(payload, runtime) {
  const user = await getUser(runtime, payload.userId);
  assertRequired(payload.notificationId, "notificationId", "请选择通知");

  const notification = await runtime.store.updateOne(
    "notifications",
    { notificationId: payload.notificationId, userId: user.userId },
    () => ({
      read: true,
      readAt: runtime.now()
    })
  );

  if (!notification) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "通知不存在");
  }

  return notification;
}

const handlers = {
  create,
  list,
  markRead
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
