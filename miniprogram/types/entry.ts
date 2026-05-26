import type { EntryType } from "./common";

export type EntryContactMethod = "wechat" | "phone";

/**
 * 单次报名联系信息。
 */
export interface EntryContactInfo {
  method: EntryContactMethod;
  value: string;
  arrivalTime?: string;
  note?: string;
}

/**
 * 报名记录。
 */
export interface Entry {
  entryId: string;
  partyId: string;
  userId: string;
  userNickname: string;
  entryType: EntryType;
  seqNo: number | null;
  waitlistNo: number | null;
  createdAt: string;
  confirmedAt: string | null;
  contactInfo?: EntryContactInfo | null;
  userAvatarUrl?: string;
  userGender?: string;
}
