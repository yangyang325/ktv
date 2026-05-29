import { callCloudFunction } from "./cloud";
import type { User } from "../../types/user";

interface FollowStatusResult {
  targetUserId: string;
  isFollowing: boolean;
}

export interface FollowStats {
  userId: string;
  followerCount: number;
  followingCount: number;
}

/**
 * 判断当前用户是否已关注目标用户。
 * @param targetUserId 目标用户 ID
 * @returns 是否已关注
 */
export async function isUserFollowing(targetUserId: string): Promise<boolean> {
  const result = await callCloudFunction<FollowStatusResult>("auth", "followStatus", { targetUserId });
  return result.isFollowing;
}

/**
 * 切换当前用户对目标用户的关注状态。
 * @param targetUserId 目标用户 ID
 * @returns 切换后是否已关注
 */
export async function toggleUserFollow(targetUserId: string): Promise<boolean> {
  const result = await callCloudFunction<FollowStatusResult>("auth", "followToggle", { targetUserId });
  return result.isFollowing;
}

/**
 * 获取用户关注与粉丝统计。
 * @param targetUserId 目标用户 ID，缺省时查询当前用户
 * @returns 关注统计
 */
export async function getFollowStats(targetUserId?: string): Promise<FollowStats> {
  return callCloudFunction<FollowStats>("auth", "followStats", targetUserId ? { targetUserId } : {});
}

/**
 * 获取当前用户已关注的用户列表。
 * @returns 已关注用户公开资料列表
 */
export async function getFollowingUsers(): Promise<User[]> {
  return callCloudFunction<User[]>("auth", "followList", {});
}
