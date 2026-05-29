const crypto = require("node:crypto");

const { AppError, ERROR_CODES, assertRequired } = require("./shared/errors");
const { createRuntime } = require("./shared/runtime");
const { runAction } = require("./shared/response");
const { selectRandomProfileAvatarImage } = require("./shared/assets");
const { buildPartyView } = require("./shared/party-view");

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
 * 获取当前已登录用户。
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<object>} 当前用户
 */
async function getCurrentUser(runtime) {
  if (!runtime.hasExplicitOpenid) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  const currentUser = await findCurrentUser(runtime);
  if (!currentUser) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  return currentUser;
}

/**
 * 查找被关注用户。
 * @param {{ targetUserId?: string }} payload 关注参数
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<object>} 被关注用户
 */
async function findTargetUser(payload, runtime) {
  assertRequired(payload.targetUserId, "targetUserId", "请选择关注用户");

  const targetUser = await runtime.store.findOne("users", { userId: payload.targetUserId });
  if (!targetUser) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "用户不存在");
  }

  return targetUser;
}

/**
 * 判断关注关系是否有效。
 * @param {object} follow 关注关系
 * @returns {boolean} 是否已关注
 */
function isActiveFollow(follow) {
  return Boolean(follow && follow.active);
}

/**
 * 构建稳定关注关系 ID。
 * @param {string} followerId 关注者 ID
 * @param {string} targetUserId 被关注用户 ID
 * @returns {string} 关注关系 ID
 */
function buildFollowId(followerId, targetUserId) {
  return `follow-${followerId}-${targetUserId}`;
}

/**
 * 登录并返回当前用户信息。
 * @param {{ nickname?: string, avatarUrl?: string, gender?: string, intro?: string, tags?: string[] }} payload 登录资料
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

    if (Object.prototype.hasOwnProperty.call(payload, "gender")) {
      updates.gender = payload.gender;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "intro")) {
      updates.intro = payload.intro;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "tags")) {
      updates.tags = normalizeProfileTags(payload.tags);
    }

    const user = await runtime.store.updateOne("users", { openid: runtime.openid }, () => updates);
    return { openid: runtime.openid, user };
  }

  const user = await runtime.store.insert("users", {
    userId: buildUserId(runtime.openid),
    openid: runtime.openid,
    nickname: payload.nickname || "微信用户",
    avatarUrl: payload.avatarUrl || selectRandomProfileAvatarImage(),
    gender: payload.gender || "保密",
    intro: payload.intro || "",
    tags: normalizeProfileTags(payload.tags),
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return { openid: runtime.openid, user };
}

/**
 * 规范化用户资料标签。
 * @param {unknown} tags 原始标签列表
 * @returns {string[]} 去重后的标签列表
 */
function normalizeProfileTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 6)
    )
  );
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
 * 构建公开用户资料。
 * @param {object} user 云端用户数据
 * @returns {object} 可公开展示的用户资料
 */
function buildPublicUser(user) {
  return {
    userId: user.userId,
    nickname: user.nickname || "K歌爱好者",
    avatarUrl: user.avatarUrl || "",
    gender: user.gender || "保密",
    intro: user.intro || "",
    tags: normalizeProfileTags(user.tags),
    createdAt: user.createdAt || ""
  };
}

/**
 * 构建用户公开组局统计。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {string} userId 用户 ID
 * @returns {Promise<{ hostingCount: number, successfulCount: number }>} 组局统计
 */
async function buildPublicProfileStats(runtime, userId) {
  const parties = await runtime.store.list("parties", { hostId: userId });
  const visibleParties = parties.filter((party) => party.status !== "draft" && party.status !== "cancelled");
  const successfulParties = visibleParties.filter((party) => Number(party.confirmedCount) >= 2);

  return {
    hostingCount: visibleParties.length,
    successfulCount: successfulParties.length
  };
}

/**
 * 读取用户最近发起的可见活动。
 * @param {{ store: object }} runtime 云函数运行时
 * @param {object} user 公开资料用户
 * @returns {Promise<object | null>} 最近发起活动展示数据
 */
async function buildRecentHostedParty(runtime, user) {
  const parties = await runtime.store.list("parties", { hostId: user.userId });
  const visibleParties = parties
    .filter((party) => party.status !== "draft" && party.status !== "cancelled")
    .sort((left, right) =>
      String(right.publishedAt || right.updatedAt || right.createdAt || "").localeCompare(
        String(left.publishedAt || left.updatedAt || left.createdAt || "")
      )
    );
  const recentParty = visibleParties[0];

  if (!recentParty) {
    return null;
  }

  const venue = recentParty.venueId
    ? await runtime.store.findOne("venues", { venueId: recentParty.venueId })
    : null;

  return buildPartyView({
    party: recentParty,
    host: user,
    venue
  });
}

/**
 * 获取指定用户公开资料。
 * @param {{ userId?: string }} payload 查询参数
 * @param {{ store: object }} runtime 云函数运行时
 * @returns {Promise<{ user: object, stats: { hostingCount: number, successfulCount: number }, recentParty: object | null }>} 公开资料
 */
async function publicProfile(payload, runtime) {
  assertRequired(payload.userId, "userId", "请选择发起者");

  const user = await runtime.store.findOne("users", { userId: payload.userId });
  if (!user) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "用户不存在");
  }

  return {
    user: buildPublicUser(user),
    stats: await buildPublicProfileStats(runtime, user.userId),
    recentParty: await buildRecentHostedParty(runtime, user)
  };
}

/**
 * 查询当前用户是否关注目标用户。
 * @param {{ targetUserId?: string }} payload 关注查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<{ targetUserId: string, isFollowing: boolean }>} 关注状态
 */
async function followStatus(payload, runtime) {
  const targetUser = await findTargetUser(payload, runtime);
  const currentUser = await findCurrentUser(runtime);

  if (!runtime.hasExplicitOpenid || !currentUser || currentUser.userId === targetUser.userId) {
    return {
      targetUserId: targetUser.userId,
      isFollowing: false
    };
  }

  const follow = await runtime.store.findOne("follows", {
    followerId: currentUser.userId,
    targetUserId: targetUser.userId
  });

  return {
    targetUserId: targetUser.userId,
    isFollowing: isActiveFollow(follow)
  };
}

/**
 * 切换当前用户对目标用户的关注状态。
 * @param {{ targetUserId?: string }} payload 关注切换参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean, now: Function }} runtime 云函数运行时
 * @returns {Promise<{ targetUserId: string, isFollowing: boolean }>} 切换后的关注状态
 */
async function followToggle(payload, runtime) {
  const currentUser = await getCurrentUser(runtime);
  const targetUser = await findTargetUser(payload, runtime);

  if (currentUser.userId === targetUser.userId) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "不能关注自己");
  }

  const timestamp = runtime.now();
  const follow = await runtime.store.findOne("follows", {
    followerId: currentUser.userId,
    targetUserId: targetUser.userId
  });

  if (follow) {
    const isFollowing = !follow.active;
    await runtime.store.updateOne("follows", { followId: follow.followId }, () => ({
      active: isFollowing,
      updatedAt: timestamp
    }));

    return {
      targetUserId: targetUser.userId,
      isFollowing
    };
  }

  await runtime.store.insert("follows", {
    followId: buildFollowId(currentUser.userId, targetUser.userId),
    followerId: currentUser.userId,
    targetUserId: targetUser.userId,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return {
    targetUserId: targetUser.userId,
    isFollowing: true
  };
}

/**
 * 查询用户关注与粉丝统计。
 * @param {{ targetUserId?: string }} payload 统计查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<{ userId: string, followerCount: number, followingCount: number }>} 关注统计
 */
async function followStats(payload, runtime) {
  const targetUser = payload.targetUserId
    ? await findTargetUser(payload, runtime)
    : await getCurrentUser(runtime);
  const [followers, following] = await Promise.all([
    runtime.store.list("follows", { targetUserId: targetUser.userId, active: true }),
    runtime.store.list("follows", { followerId: targetUser.userId, active: true })
  ]);

  return {
    userId: targetUser.userId,
    followerCount: followers.length,
    followingCount: following.length
  };
}

/**
 * 查询当前用户已关注的用户列表。
 * @param {Record<string, unknown>} payload 查询参数
 * @param {{ store: object, openid: string, hasExplicitOpenid?: boolean }} runtime 云函数运行时
 * @returns {Promise<object[]>} 已关注用户公开资料列表
 */
async function followList(payload, runtime) {
  const currentUser = await getCurrentUser(runtime);
  const follows = await runtime.store.list("follows", { followerId: currentUser.userId, active: true });
  const sortedFollows = follows.sort((left, right) =>
    String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""))
  );
  const users = await Promise.all(
    sortedFollows.map((follow) => runtime.store.findOne("users", { userId: follow.targetUserId }))
  );

  return users.filter(Boolean).map(buildPublicUser);
}

const handlers = {
  login,
  profile,
  publicProfile,
  followStatus,
  followToggle,
  followStats,
  followList
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
