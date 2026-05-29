export interface SubmitGuardOptions {
  cooldownMs?: number;
}

const DEFAULT_SUBMIT_COOLDOWN_MS = 800;

/**
 * 创建接口提交防抖锁。
 * @param options 防抖配置
 * @returns 包含防抖执行方法的提交锁
 */
export function createSubmitGuard(options: SubmitGuardOptions = {}) {
  let running = false;
  let lastRunAt = 0;
  const cooldownMs = options.cooldownMs ?? DEFAULT_SUBMIT_COOLDOWN_MS;

  return {
    /**
     * 在防抖窗口和接口执行期间只允许一次提交。
     * @param action 需要执行的异步提交逻辑
     * @returns 提交结果，重复点击时返回空值
     */
    async run<T>(action: () => Promise<T>): Promise<T | null> {
      const now = Date.now();
      if (running || now - lastRunAt < cooldownMs) {
        return null;
      }

      running = true;
      lastRunAt = now;

      try {
        return await action();
      } finally {
        running = false;
      }
    }
  };
}
