/**
 * 用户信息。
 */
export interface User {
  userId: string;
  nickname: string;
  avatarUrl: string;
  gender?: string;
  intro?: string;
  createdAt: string;
}
