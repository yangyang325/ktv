const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");

/**
 * 根据 openid 构建稳定用户 ID。
 * @param {string} openid 微信 openid
 * @returns {string} 用户 ID
 */
function buildUserId(openid) {
  return `user-${openid.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
}

/**
 * 查找当前登录用户。
 * @param {{ store: object, openid: string }} runtime 云函数运行时
 * @returns {Promise<object | null>} 当前用户
 */
function findCurrentUser(runtime) {
  return runtime.store.findOne("users", (user) => user.openid === runtime.openid);
}

/**
 * 登录并返回当前用户信息。
 * @param {{ nickname?: string, avatarUrl?: string }} payload 登录资料
 * @param {{ store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<{ openid: string, user: object }>} 登录结果
 */
async function login(payload, runtime) {
  const currentUser = await findCurrentUser(runtime);
  const timestamp = runtime.now();

  if (currentUser) {
    const updates = { updatedAt: timestamp };

    if (Object.prototype.hasOwnProperty.call(payload, "nickname")) {
      updates.nickname = payload.nickname;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "avatarUrl")) {
      updates.avatarUrl = payload.avatarUrl;
    }

    const user = await runtime.store.updateOne("users", (item) => item.openid === runtime.openid, () => updates);
    return { openid: runtime.openid, user };
  }

  const user = await runtime.store.insert("users", {
    userId: buildUserId(runtime.openid),
    openid: runtime.openid,
    nickname: payload.nickname || "微信用户",
    avatarUrl: payload.avatarUrl || "",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return { openid: runtime.openid, user };
}

/**
 * 获取当前用户资料。
 * @param {Record<string, unknown>} payload 请求载荷
 * @param {{ store: object, openid: string }} runtime 云函数运行时
 * @returns {Promise<object | null>} 当前用户资料
 */
async function profile(payload, runtime) {
  return findCurrentUser(runtime);
}

const handlers = {
  login,
  profile
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
