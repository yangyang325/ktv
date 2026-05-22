const crypto = require("node:crypto");

const { createRuntime } = require("./shared/runtime");
const { runAction } = require("./shared/response");
const { AppError, ERROR_CODES, assertRequired } = require("./shared/errors");

/**
 * 根据 openid 构建稳定用户 ID。
 * @param {string} openid 微信 openid
 * @returns {string} 用户 ID
 */
function buildUserId(openid) {
  return `user-${crypto.createHash("sha256").update(openid).digest("hex").slice(0, 24)}`;
}

/**
 * 查找当前登录用户。
 * @param {{ store: object, openid: string }} runtime 云函数运行时
 * @returns {Promise<object | null>} 当前用户
 */
function findCurrentUser(runtime) {
  return runtime.store.findOne("users", { openid: runtime.openid });
}

/**
 * 从微信手机号接口响应中读取手机号。
 * @param {object} response 微信手机号接口响应
 * @returns {string} 手机号
 */
function readPhoneNumber(response) {
  return (
    response?.phone_info?.phoneNumber ||
    response?.phoneInfo?.phoneNumber ||
    response?.phone_info?.purePhoneNumber ||
    response?.phoneInfo?.purePhoneNumber ||
    ""
  );
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

    const user = await runtime.store.updateOne("users", { openid: runtime.openid }, () => updates);
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

/**
 * 通过微信授权 code 获取手机号并写回当前用户。
 * @param {{ code?: string }} payload 请求载荷
 * @param {{ cloud?: object, store: object, openid: string, now: Function }} runtime 云函数运行时
 * @returns {Promise<{ phoneNumber: string, user: object | null }>} 手机号结果
 */
async function getPhoneNumber(payload, runtime) {
  assertRequired(payload.code, "code", "请先授权手机号");

  const phoneApi = runtime.cloud?.openapi?.phonenumber;
  if (!phoneApi || typeof phoneApi.getPhoneNumber !== "function") {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "手机号服务不可用");
  }

  const response = await phoneApi.getPhoneNumber({ code: payload.code });
  const phoneNumber = readPhoneNumber(response);
  assertRequired(phoneNumber, "phoneNumber", "未获取到手机号");

  const timestamp = runtime.now();
  const currentUser = await findCurrentUser(runtime);
  const user = currentUser
    ? await runtime.store.updateOne("users", { openid: runtime.openid }, () => ({
        phoneNumber,
        updatedAt: timestamp
      }))
    : await runtime.store.insert("users", {
        userId: buildUserId(runtime.openid),
        openid: runtime.openid,
        nickname: "微信用户",
        avatarUrl: "",
        phoneNumber,
        createdAt: timestamp,
        updatedAt: timestamp
      });

  return {
    phoneNumber,
    user
  };
}

const handlers = {
  login,
  profile,
  getPhoneNumber
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
