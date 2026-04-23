import type { User } from "../types/user";

/**
 * 用户模拟数据。
 */
export const userList: User[] = [
  {
    userId: "user-host",
    nickname: "羊羊",
    avatarUrl: "https://example.com/avatar-host.png",
    createdAt: "2026-04-20T12:00:00.000Z"
  },
  {
    userId: "user-guest-1",
    nickname: "阿明",
    avatarUrl: "https://example.com/avatar-aming.png",
    createdAt: "2026-04-20T12:05:00.000Z"
  },
  {
    userId: "user-guest-2",
    nickname: "小秋",
    avatarUrl: "https://example.com/avatar-xiaoqiu.png",
    createdAt: "2026-04-20T12:10:00.000Z"
  },
  {
    userId: "user-guest-3",
    nickname: "阿哲",
    avatarUrl: "https://example.com/avatar-azhe.png",
    createdAt: "2026-04-20T12:15:00.000Z"
  },
  {
    userId: "user-wait-1",
    nickname: "晓峰",
    avatarUrl: "https://example.com/avatar-xiaofeng.png",
    createdAt: "2026-04-20T12:20:00.000Z"
  }
];
