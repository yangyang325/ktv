import { getUserById } from "../services/api/user";

/**
 * 确认当前用户已登录后再执行关键动作。
 * @param actionName 需要登录后执行的动作名称
 * @returns 是否已登录
 */
export async function ensureLoggedInForAction(actionName: string) {
  let hasLoggedIn = false;

  try {
    hasLoggedIn = Boolean(await getUserById());
  } catch {
    hasLoggedIn = false;
  }

  if (hasLoggedIn) {
    return true;
  }

  wx.showModal({
    title: "请先登录",
    content: `登录后才能${actionName}，请先进入我的页面完成登录。`,
    confirmText: "去登录",
    cancelText: "取消",
    success: (result) => {
      if (result.confirm) {
        wx.switchTab({
          url: "/pages/profile/index"
        });
      }
    }
  });

  return false;
}
