import type { Entry } from "../types/entry";

/**
 * 报名记录模拟数据。
 */
export const entryList: Entry[] = [
  {
    entryId: "entry-001",
    partyId: "party-001",
    userId: "user-host",
    userNickname: "羊羊",
    entryType: "confirmed",
    seqNo: 1,
    waitlistNo: null,
    createdAt: "2026-04-24T09:00:00.000Z",
    confirmedAt: "2026-04-24T09:00:00.000Z"
  },
  {
    entryId: "entry-002",
    partyId: "party-001",
    userId: "user-guest-1",
    userNickname: "阿明",
    entryType: "confirmed",
    seqNo: 2,
    waitlistNo: null,
    createdAt: "2026-04-24T09:10:00.000Z",
    confirmedAt: "2026-04-24T09:10:00.000Z",
    contactInfo: {
      method: "wechat",
      value: "aming-sing",
      arrivalTime: "19:20",
      note: "到店后等群通知"
    }
  },
  {
    entryId: "entry-003",
    partyId: "party-001",
    userId: "user-guest-2",
    userNickname: "小秋",
    entryType: "confirmed",
    seqNo: 3,
    waitlistNo: null,
    createdAt: "2026-04-24T09:20:00.000Z",
    confirmedAt: "2026-04-24T09:20:00.000Z",
    contactInfo: {
      method: "phone",
      value: "13800000000",
      arrivalTime: "19:30",
      note: "可以先加活动群"
    }
  },
  {
    entryId: "entry-004",
    partyId: "party-001",
    userId: "user-wait-1",
    userNickname: "晓峰",
    entryType: "waitlist",
    seqNo: null,
    waitlistNo: 1,
    createdAt: "2026-04-24T10:10:00.000Z",
    confirmedAt: null
  },
  {
    entryId: "entry-005",
    partyId: "party-003",
    userId: "user-guest-3",
    userNickname: "阿哲",
    entryType: "waitlist",
    seqNo: null,
    waitlistNo: 1,
    createdAt: "2026-04-24T11:00:00.000Z",
    confirmedAt: null
  }
];
