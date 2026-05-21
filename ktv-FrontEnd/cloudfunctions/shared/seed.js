const { clonePlainValue } = require("./memory-store");

const seedData = {
  users: [
    {
      userId: "user-host",
      openid: "openid-host",
      nickname: "羊羊",
      avatarUrl: "https://example.com/avatar-host.png",
      createdAt: "2026-04-20T12:00:00.000Z",
      updatedAt: "2026-04-20T12:00:00.000Z"
    },
    {
      userId: "user-guest-1",
      openid: "openid-guest-1",
      nickname: "阿明",
      avatarUrl: "https://example.com/avatar-aming.png",
      createdAt: "2026-04-20T12:05:00.000Z",
      updatedAt: "2026-04-20T12:05:00.000Z"
    },
    {
      userId: "user-guest-2",
      openid: "openid-guest-2",
      nickname: "小秋",
      avatarUrl: "https://example.com/avatar-xiaoqiu.png",
      createdAt: "2026-04-20T12:10:00.000Z",
      updatedAt: "2026-04-20T12:10:00.000Z"
    },
    {
      userId: "user-guest-3",
      openid: "openid-guest-3",
      nickname: "阿哲",
      avatarUrl: "https://example.com/avatar-azhe.png",
      createdAt: "2026-04-20T12:15:00.000Z",
      updatedAt: "2026-04-20T12:15:00.000Z"
    },
    {
      userId: "user-wait-1",
      openid: "openid-wait-1",
      nickname: "晓峰",
      avatarUrl: "https://example.com/avatar-xiaofeng.png",
      createdAt: "2026-04-20T12:20:00.000Z",
      updatedAt: "2026-04-20T12:20:00.000Z"
    }
  ],
  venues: [
    {
      venueId: "venue-001",
      name: "MUSE KTV · 南山海岸城店",
      district: "南山",
      address: "深圳市南山区海岸城东座 3 楼",
      lng: 113.934,
      lat: 22.53,
      priceLevel: 2,
      roomTypes: ["中包", "大包"],
      businessHours: "11:00-06:00",
      coverImage: "",
      avgRating: 4.6,
      isActive: true
    },
    {
      venueId: "venue-002",
      name: "纯K · 车公庙店",
      district: "福田",
      address: "深圳市福田区车公庙商圈",
      lng: 114.045,
      lat: 22.536,
      priceLevel: 3,
      roomTypes: ["中包", "豪华包"],
      businessHours: "13:00-04:00",
      coverImage: "",
      avgRating: 4.7,
      isActive: true
    }
  ],
  parties: [
    {
      partyId: "party-001",
      title: "周末嗨唱🎤放松一下",
      venueId: "venue-001",
      venueCustom: "",
      hostId: "user-host",
      startTime: "2026-04-25T19:30:00+08:00",
      durationMin: 180,
      roomFee: 68000,
      maxCapacity: 12,
      status: "recruiting",
      isPublic: false,
      notes: "周末一起放松嗨唱，曲风不限，麦霸和气氛组都欢迎～一起享受音乐的快乐吧！",
      tags: ["流行", "80后-90后", "友好局"],
      coverImage: "/assets/images/ktv/ktv-room-01.jpg",
      createdAt: "2026-04-24T09:00:00.000Z",
      updatedAt: "2026-04-24T09:00:00.000Z",
      publishedAt: "2026-04-24T09:00:00.000Z",
      confirmedCount: 3,
      waitlistCount: 1
    },
    {
      partyId: "party-002",
      title: "周五小聚，快乐K歌",
      venueId: "venue-002",
      venueCustom: "",
      hostId: "user-host",
      startTime: "2026-04-26T20:00:00+08:00",
      durationMin: 120,
      roomFee: 78000,
      maxCapacity: 8,
      status: "recruiting",
      isPublic: true,
      notes: "下班直接集合，适合粤语歌、经典老歌和轻松聊天。",
      tags: ["粤语", "90后", "气氛好"],
      coverImage: "/assets/images/ktv/ktv-room-02.jpg",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z",
      publishedAt: "2026-04-24T10:00:00.000Z",
      confirmedCount: 1,
      waitlistCount: 0
    },
    {
      partyId: "party-003",
      title: "麦霸来袭，等你来战🔥",
      venueId: "venue-001",
      venueCustom: "",
      hostId: "user-guest-1",
      startTime: "2026-04-25T22:00:00+08:00",
      durationMin: 180,
      roomFee: 88000,
      maxCapacity: 3,
      status: "full",
      isPublic: false,
      notes: "经典老歌专场，欢迎会唱、爱听、会热场的朋友。",
      tags: ["经典老歌", "80后", "麦霸局"],
      coverImage: "/assets/images/ktv/ktv-room-03.jpg",
      createdAt: "2026-04-23T18:30:00.000Z",
      updatedAt: "2026-04-23T18:30:00.000Z",
      publishedAt: "2026-04-23T18:30:00.000Z",
      confirmedCount: 3,
      waitlistCount: 1
    }
  ],
  entries: [
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
      confirmedAt: "2026-04-24T09:10:00.000Z"
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
      confirmedAt: "2026-04-24T09:20:00.000Z"
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
  ],
  notifications: []
};

/**
 * 创建种子数据。
 * @returns {Record<string, unknown[]>} 种子数据副本
 */
function createSeedData() {
  return clonePlainValue(seedData);
}

module.exports = {
  createSeedData
};
