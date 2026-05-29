const { createCloudStore } = require("./cloud-store");

/**
 * 加载微信云开发 SDK。
 * @returns {object} 微信云开发 SDK
 */
function loadCloudSdk() {
  return require("wx-server-sdk");
}

/**
 * 创建云函数运行时。
 * @param {{ store?: object, openid?: string, now?: Function }} context 运行时注入上下文
 * @returns {object} 运行时对象
 */
function createRuntime(context = {}) {
  if (context.store) {
    const hasExplicitOpenid = Object.prototype.hasOwnProperty.call(context, "openid") && Boolean(context.openid);

    return {
      cloud: context.cloud,
      db: context.db,
      store: context.store,
      openid: context.openid || "openid-host",
      hasExplicitOpenid,
      now: context.now || (() => "2026-04-24T00:00:00.000Z")
    };
  }

  const cloud = loadCloudSdk();
  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  });

  const db = cloud.database();
  const wxContext = cloud.getWXContext ? cloud.getWXContext() : {};
  const hasExplicitOpenid = Boolean(wxContext.OPENID);

  return {
    cloud,
    db,
    store: createCloudStore(db),
    openid: wxContext.OPENID || "openid-host",
    hasExplicitOpenid,
    now: () => new Date().toISOString()
  };
}

module.exports = {
  loadCloudSdk,
  createRuntime
};
