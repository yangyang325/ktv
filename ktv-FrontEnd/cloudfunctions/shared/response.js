const { AppError, ERROR_CODES } = require("./errors");

/**
 * 构建成功响应。
 * @param {unknown} data 响应数据
 * @param {string} message 响应消息
 * @returns {{ ok: true, data: unknown, message: string }} 统一成功响应
 */
function success(data, message = "success") {
  return { ok: true, data, message };
}

/**
 * 构建失败响应。
 * @param {string} code 错误码
 * @param {string} message 错误消息
 * @returns {{ ok: false, code: string, message: string }} 统一失败响应
 */
function failure(code, message) {
  return { ok: false, code, message };
}

/**
 * 执行动作并统一响应结构。
 * @param {Record<string, Function>} handlers 动作处理器
 * @param {{ action?: string, payload?: Record<string, unknown> }} event 云函数入参
 * @param {object} runtime 运行时上下文
 * @returns {Promise<object>} 统一响应
 */
async function runAction(handlers, event = {}, runtime = {}) {
  try {
    const action = event.action;
    const handler = handlers[action];

    if (!handler) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "未知操作");
    }

    const data = await handler(event.payload || {}, runtime);
    return success(data);
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error.code, error.message);
    }

    return failure(ERROR_CODES.INTERNAL_ERROR, "服务异常");
  }
}

module.exports = {
  success,
  failure,
  runAction
};
