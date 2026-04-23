/**
 * 登录云函数占位实现。
 * @param {Record<string, unknown>} event 云函数入参
 * @returns {{ ok: boolean, module: string, event: Record<string, unknown> }}
 */
exports.main = async (event) => {
  return {
    ok: true,
    module: "auth",
    event
  };
};
