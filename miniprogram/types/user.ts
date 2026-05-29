import type { Party } from "./party";

/**
 * 用户信息。
 */
export interface User {
  userId: string;
  nickname: string;
  avatarUrl: string;
  gender?: string;
  intro?: string;
  tags?: string[];
  createdAt: string;
}

/**
 * 用户公开资料统计。
 */
export interface PublicUserProfileStats {
  hostingCount: number;
  successfulCount: number;
}

/**
 * 用户公开资料。
 */
export interface PublicUserProfile {
  user: User;
  stats: PublicUserProfileStats;
  recentParty?: Party | null;
}
