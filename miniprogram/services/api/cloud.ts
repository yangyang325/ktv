/**
 * 云函数成功响应。
 */
interface CloudSuccess<T> {
  ok: true;
  data: T;
  message: string;
}

/**
 * 云函数失败响应。
 */
interface CloudFailure {
  ok: false;
  code: string;
  message: string;
}

/**
 * 云函数调用结果。
 */
interface CloudCallResult<T> {
  result?: CloudSuccess<T> | CloudFailure;
}

/**
 * 带错误码的云端错误。
 */
export interface CloudApiError extends Error {
  code?: string;
}

/**
 * 解包云函数结果。
 * @param response 云函数原始响应
 * @returns 云端 data
 */
export function unwrapCloudResult<T>(response: CloudCallResult<T>): T {
  const result = response.result;

  if (!result) {
    const error = new Error("云函数无响应") as CloudApiError;
    error.code = "INTERNAL_ERROR";
    throw error;
  }

  if (!result.ok) {
    const error = new Error(result.message) as CloudApiError;
    error.code = result.code;
    throw error;
  }

  return result.data;
}

/**
 * 调用云函数。
 * @param name 云函数名
 * @param action 动作名
 * @param payload 入参
 * @returns 云端 data
 */
export async function callCloudFunction<T>(
  name: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  if (typeof wx === "undefined" || !wx.cloud) {
    const error = new Error("当前环境不支持云函数") as CloudApiError;
    error.code = "INTERNAL_ERROR";
    throw error;
  }

  const response = await wx.cloud.callFunction({
    name,
    data: {
      action,
      payload
    }
  });

  return unwrapCloudResult<T>(response as CloudCallResult<T>);
}
