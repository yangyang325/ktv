import type { EntryType } from "./common";

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
}
