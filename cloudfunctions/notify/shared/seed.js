const { clonePlainValue } = require("./memory-store");
const { KTV_ROOM_COVER_IMAGES } = require("./assets");

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
      notes: "周末一起放松嗨唱，曲风不限，轮流唱歌，按线下AA参考参与。",
      tags: ["流行", "怀旧金曲", "新手友好"],
      coverImage: KTV_ROOM_COVER_IMAGES.room01,
      createdAt: "2026-04-24T09:00:00.000Z",
      updatedAt: "2026-04-24T09:00:00.000Z",
      publishedAt: "2026-04-24T09:00:00.000Z",
      confirmedCount: 5,
      waitlistCount: 1,
      estimatedPerPerson: 6800,
      hostSummary: "小麦麦",
      venueSummary: "MUSE KTV · 南山海岸城店",
      progressText: "6/10人",
      statusText: "进行中",
      priceText: "¥68/人",
      timeSummary: "今天 20:00-23:00"
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
      notes: "下班直接集合，适合粤语歌、经典老歌和轻松听歌。",
      tags: ["粤语", "经典老歌", "轻松氛围"],
      coverImage: KTV_ROOM_COVER_IMAGES.room02,
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z",
      publishedAt: "2026-04-24T10:00:00.000Z",
      confirmedCount: 7,
      waitlistCount: 0,
      estimatedPerPerson: 7800,
      hostSummary: "小麦麦",
      venueSummary: "纯K · 车公庙店",
      progressText: "4/8人",
      statusText: "报名中",
      priceText: "¥78/人",
      timeSummary: "明天 19:30-22:30"
    },
    {
      partyId: "party-003",
      title: "麦霸来袭，等你来唱",
      venueId: "venue-001",
      venueCustom: "",
      hostId: "user-guest-1",
      startTime: "2026-04-25T22:00:00+08:00",
      durationMin: 180,
      roomFee: 88000,
      maxCapacity: 6,
      status: "full",
      isPublic: false,
      notes: "经典老歌专场，欢迎会唱、爱听的K歌爱好者。",
      tags: ["经典老歌", "轮流唱"],
      coverImage: KTV_ROOM_COVER_IMAGES.room03,
      createdAt: "2026-04-23T18:30:00.000Z",
      updatedAt: "2026-04-23T18:30:00.000Z",
      publishedAt: "2026-04-23T18:30:00.000Z",
      confirmedCount: 6,
      waitlistCount: 1,
      estimatedPerPerson: 8800,
      hostSummary: "阿明",
      venueSummary: "MUSE KTV · 南山海岸城店",
      progressText: "3/10人",
      statusText: "报名中",
      priceText: "¥88/人",
      timeSummary: "周日 18:00-21:00"
    },
    {
      partyId: "party-004",
      title: "周日经典老歌之夜",
      venueId: "venue-002",
      venueCustom: "",
      hostId: "user-host",
      startTime: "2026-04-18T19:00:00+08:00",
      durationMin: 180,
      roomFee: 68000,
      maxCapacity: 10,
      status: "finished",
      isPublic: false,
      notes: "已结束。",
      tags: ["经典老歌"],
      coverImage: KTV_ROOM_COVER_IMAGES.room03,
      createdAt: "2026-04-16T09:00:00.000Z",
      updatedAt: "2026-04-16T09:00:00.000Z",
      publishedAt: "2026-04-16T09:00:00.000Z",
      confirmedCount: 10,
      waitlistCount: 0,
      estimatedPerPerson: 6800,
      hostSummary: "小麦麦",
      venueSummary: "纯K · 车公庙店",
      progressText: "10/10人",
      statusText: "已结束",
      priceText: "¥68/人",
      timeSummary: "05-19 18:00-21:00"
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
