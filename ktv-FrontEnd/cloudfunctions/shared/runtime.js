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
    return {
      store: context.store,
      openid: context.openid || "openid-host",
      now: context.now || (() => new Date().toISOString())
    };
  }

  const cloud = loadCloudSdk();
  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  });

  const wxContext = cloud.getWXContext ? cloud.getWXContext() : {};

  return {
    cloud,
    db: cloud.database(),
    store: createCloudStore(cloud.database()),
    openid: wxContext.OPENID || "openid-host",
    now: () => new Date().toISOString()
  };
}

module.exports = {
  loadCloudSdk,
  createRuntime
};
