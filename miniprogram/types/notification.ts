/**
 * 通知记录。
 */
export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  partyId?: string;
  entryId?: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
}
