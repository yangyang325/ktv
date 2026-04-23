/**
 * 通知事件占位模型。
 */
export interface NotifyEvent {
  eventId: string;
  partyId: string;
  type: "waitlist-promoted" | "party-updated" | "party-cancelled";
  createdAt: string;
}
