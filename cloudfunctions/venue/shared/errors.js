const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PARTY_FULL: "PARTY_FULL",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  PARTY_NOT_RECRUITING: "PARTY_NOT_RECRUITING",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};

class AppError extends Error {
  /**
   * 创建业务错误。
   * @param {string} code 错误码
   * @param {string} message 错误信息
   */
  constructor(code, message) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

/**
 * 校验必填字段。
 * @param {unknown} value 字段值
 * @param {string} field 字段名
 * @param {string} message 错误信息
 */
function assertRequired(value, field, message) {
  if (value === undefined || value === null || value === "") {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, message || `${field}不能为空`);
  }
}

/**
 * 校验条件是否成立。
 * @param {boolean} condition 条件
 * @param {string} code 错误码
 * @param {string} message 错误信息
 */
function assertCondition(condition, code, message) {
  if (!condition) {
    throw new AppError(code, message);
  }
}

module.exports = {
  AppError,
  ERROR_CODES,
  assertRequired,
  assertCondition
};
