import type { PartyStatus } from "./common";

/**
 * 局卡片报名人头像。
 */
export interface PartyParticipantAvatar {
  userId: string;
  nickname: string;
  avatarUrl: string;
}

/**
 * 局信息。
 */
export interface Party {
  partyId: string;
  title: string;
  venueId: string;
  venueCustom: string;
  hostId: string;
  startTime: string;
  durationMin: number;
  roomFee: number;
  maxCapacity: number;
  status: PartyStatus;
  isPublic: boolean;
  notes: string;
  tags: string[];
  coverImage: string;
  createdAt: string;
  confirmedCount: number;
  waitlistCount: number;
  estimatedPerPerson: number;
  hostSummary: string;
  venueSummary: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  progressText: string;
  statusText: string;
  priceText: string;
  timeSummary: string;
  participantAvatars: PartyParticipantAvatar[];
}

/**
 * 创建局草稿表单。
 */
export interface PartyDraftInput {
  title: string;
  venueId: string;
  venueSummary: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  startDate: string;
  startTime: string;
  durationMin: number;
  roomFee: number;
  maxCapacity: number;
  notes: string;
  tags: string[];
  coverImage?: string;
}
