import type { Notification } from "../../types/notification";
import { callCloudFunction } from "./cloud";

/**
 * 获取当前登录用户的云端通知列表。
 * @returns 通知列表
 */
export async function getNotificationList() {
  return callCloudFunction<Notification[]>("notify", "list", {});
}

/**
 * 标记当前登录用户的通知为已读。
 * @param notificationId 通知 ID
 * @returns 更新后的通知
 */
export async function markNotificationRead(notificationId: string) {
  return callCloudFunction<Notification>("notify", "markRead", { notificationId });
}
