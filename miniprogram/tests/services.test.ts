import assert from "node:assert/strict";
import test from "node:test";
import {
  createPartyDraft,
  getMyPartyTabs,
  getPartyDetail,
  getPartyList,
  joinParty,
  joinWaitlist,
  publishParty
} from "../services/api/party";
import {
  getFavoriteParties,
  isPartyFavorited,
  togglePartyFavorite
} from "../services/api/favorite";
import { getNotificationList, markNotificationRead } from "../services/api/notify";
import { unwrapCloudResult } from "../services/api/cloud";
import {
  buildTencentMapReverseGeocoderUrl,
  reverseGeocodeCity
} from "../services/api/location";
import { uploadPartyCover } from "../services/api/upload";
import {
  getCurrentUser,
  getCurrentUserWithWechatProfile,
  getUserById,
  updateCurrentUser
} from "../services/api/user";
import { locationConfig, serviceConfig } from "../services/config";

const defaultProfileAvatarUrl =
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/tkojc1mplzroo1.png";

interface CloudCall {
  name: string;
  data: {
    action: string;
    payload: Record<string, unknown>;
  };
}

const originalWx = (globalThis as typeof globalThis & { wx?: unknown }).wx;
const sampleParty = {
  partyId: "party-cloud-001",
  title: "云端真实活动",
  venueId: "venue-cloud-001",
  venueCustom: "",
  hostId: "user-cloud-host",
  startTime: "2026-05-23T19:30:00+08:00",
  durationMin: 180,
  roomFee: 240000,
  maxCapacity: 8,
  status: "recruiting",
  isPublic: true,
  notes: "",
  tags: ["流行"],
  coverImage: "cloud://party-cover-file",
  createdAt: "2026-05-20T10:00:00+08:00",
  confirmedCount: 1,
  waitlistCount: 0,
  estimatedPerPerson: 30000,
  hostSummary: "云端用户",
  venueSummary: "真实KTV",
  venueAddress: "深圳市南山区真实地址",
  progressText: "1 / 8",
  statusText: "报名中",
  priceText: "¥300/人",
  timeSummary: "05-23 周六 19:30 · 3小时",
  participantAvatars: []
};

/**
 * 安装云函数调用桩。
 * @param resolver 云函数响应生成器
 * @returns 调用记录和清理函数
 */
function installCloudCallMock(resolver: (call: CloudCall) => unknown) {
  const calls: CloudCall[] = [];
  (globalThis as typeof globalThis & { wx?: unknown }).wx = {
    cloud: {
      callFunction: async (options: CloudCall) => {
        calls.push(options);
        return {
          result: {
            ok: true,
            data: resolver(options),
            message: "success"
          }
        };
      }
    }
  };

  return {
    calls,
    restore() {
      (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
    }
  };
}

test("首页列表从云端活动接口读取真实数据", async () => {
  const cloud = installCloudCallMock(() => [sampleParty]);

  try {
    const parties = await getPartyList();

    assert.deepEqual(parties, [sampleParty]);
    assert.deepEqual(cloud.calls.map((call) => `${call.name}.${call.data.action}`), ["party.list"]);
  } finally {
    cloud.restore();
  }
});

test("活动详情和收藏列表读取云端收藏数据", async () => {
  let favoriteState = false;
  const cloud = installCloudCallMock((call) => {
    if (call.data.action === "detail") {
      return {
        party: sampleParty,
        host: { userId: "user-cloud-host", nickname: "云端用户", avatarUrl: "", createdAt: "" },
        confirmedEntries: [],
        waitlistEntries: [],
        viewerEntry: null,
        canViewContacts: false
      };
    }

    if (call.data.action === "favoriteStatus") {
      return { partyId: call.data.payload.partyId, isFavorited: favoriteState };
    }

    if (call.data.action === "favoriteToggle") {
      favoriteState = !favoriteState;
      return { partyId: call.data.payload.partyId, isFavorited: favoriteState };
    }

    if (call.data.action === "favoriteList") {
      return favoriteState ? [sampleParty] : [];
    }

    return {};
  });

  try {
    const detail = await getPartyDetail(sampleParty.partyId);
    assert.equal(detail.party.partyId, sampleParty.partyId);
    assert.equal(await isPartyFavorited(sampleParty.partyId), false);
    assert.equal(await togglePartyFavorite(sampleParty.partyId), true);
    assert.equal(await isPartyFavorited(sampleParty.partyId), true);

    const favoriteParties = await getFavoriteParties();
    assert.equal(favoriteParties[0].partyId, sampleParty.partyId);
    assert.deepEqual(
      cloud.calls.map((call) => `${call.name}.${call.data.action}`),
      [
        "party.detail",
        "party.favoriteStatus",
        "party.favoriteToggle",
        "party.favoriteStatus",
        "party.favoriteList"
      ]
    );
    assert.equal(
      cloud.calls
        .filter((call) => call.data.action !== "favoriteList")
        .every((call) => call.data.payload.partyId === sampleParty.partyId),
      true
    );
  } finally {
    cloud.restore();
  }
});

test("当前用户活动聚合不向云端传 mock 用户 ID", async () => {
  const cloud = installCloudCallMock(() => ({
    hosting: [],
    joined: [],
    waitlist: [],
    history: []
  }));

  try {
    const tabs = await getMyPartyTabs();
    assert.deepEqual(Object.keys(tabs), ["hosting", "joined", "waitlist", "history"]);
    assert.deepEqual(cloud.calls[0].data.payload, {});
  } finally {
    cloud.restore();
  }
});

test("发起报名候补流程只提交云端真实载荷", async () => {
  const cloud = installCloudCallMock((call) => {
    if (call.name === "entry") {
      return {
        entryId: "entry-cloud-001",
        partyId: call.data.payload.partyId,
        userId: "user-cloud-current",
        userNickname: "云端用户",
        entryType: call.data.action === "waitlist" ? "waitlist" : "confirmed",
        seqNo: 1,
        waitlistNo: call.data.action === "waitlist" ? 1 : null,
        createdAt: "",
        confirmedAt: ""
      };
    }

    return sampleParty;
  });
  const contactInfo = {
    method: "wechat" as const,
    value: "real-wechat",
    arrivalTime: "19:20",
    note: "到店后等群通知"
  };

  try {
    await createPartyDraft({
      title: "云端测试活动",
      venueId: "venue-cloud-001",
      venueSummary: "真实KTV",
      startDate: "2026-05-23",
      startTime: "19:30",
      durationMin: 180,
      roomFee: 240000,
      maxCapacity: 8,
      notes: "",
      tags: [],
      coverImage: "cloud://party-cover-file",
      venueAddress: "深圳市南山区真实地址",
      venueLatitude: 22.53,
      venueLongitude: 113.934
    });
    await publishParty(sampleParty.partyId);
    await joinParty(sampleParty.partyId, contactInfo);
    await joinWaitlist(sampleParty.partyId);

    assert.deepEqual(
      cloud.calls.map((call) => `${call.name}.${call.data.action}`),
      ["party.createDraft", "party.publish", "entry.join", "entry.waitlist"]
    );
    assert.equal(cloud.calls.some((call) => "userId" in call.data.payload), false);
    assert.deepEqual(cloud.calls.find((call) => call.data.action === "join")?.data.payload.contactInfo, contactInfo);
  } finally {
    cloud.restore();
  }
});

test("当前用户资料从云端登录接口读取并保存", async () => {
  const cloud = installCloudCallMock((call) => ({
    user: {
      userId: "user-cloud-current",
      nickname: (call.data.payload.nickname as string) || "微信用户",
      avatarUrl: (call.data.payload.avatarUrl as string) || defaultProfileAvatarUrl,
      gender: (call.data.payload.gender as string) || "保密",
      intro: (call.data.payload.intro as string) || "记录深圳K歌兴趣活动",
      createdAt: "2026-05-20T10:00:00+08:00"
    }
  }));

  try {
    const user = await getCurrentUser();
    assert.equal(user.nickname, "微信用户");

    const updated = await updateCurrentUser({
      nickname: "真实昵称",
      avatarUrl: defaultProfileAvatarUrl,
      gender: "女",
      intro: "喜欢粤语老歌"
    });
    assert.equal(updated.nickname, "真实昵称");
    assert.equal(updated.avatarUrl, defaultProfileAvatarUrl);
    assert.equal(updated.gender, "女");
    assert.equal(updated.intro, "喜欢粤语老歌");
    assert.deepEqual(
      cloud.calls.map((call) => call.data.payload),
      [{}, { nickname: "真实昵称", avatarUrl: defaultProfileAvatarUrl, gender: "女", intro: "喜欢粤语老歌" }]
    );
  } finally {
    cloud.restore();
  }
});

test("我的页首次登录会同步微信头像昵称", async () => {
  const wechatAvatarUrl = "https://example.com/wechat-avatar.png";
  const cloud = installCloudCallMock((call) => {
    if (call.data.action === "profile") {
      return null;
    }

    return {
      user: {
        userId: "user-cloud-current",
        nickname: (call.data.payload.nickname as string) || "微信用户",
        avatarUrl: (call.data.payload.avatarUrl as string) || defaultProfileAvatarUrl,
        gender: "保密",
        intro: "记录深圳K歌兴趣活动",
        createdAt: "2026-05-20T10:00:00+08:00"
      }
    };
  });
  (globalThis as typeof globalThis & {
    wx?: {
      getUserProfile?: (options: { desc: string }) => Promise<{ userInfo: { nickName: string; avatarUrl: string } }>;
    };
  }).wx = {
    ...(globalThis as typeof globalThis & { wx?: object }).wx,
    getUserProfile: async () => ({
      userInfo: {
        nickName: "羊羊",
        avatarUrl: wechatAvatarUrl
      }
    })
  };

  try {
    const existingUser = await getUserById();
    const currentUser = await getCurrentUserWithWechatProfile();

    assert.equal(existingUser, null);
    assert.equal(currentUser.nickname, "羊羊");
    assert.equal(currentUser.avatarUrl, wechatAvatarUrl);
    assert.deepEqual(
      cloud.calls.map((call) => `${call.name}.${call.data.action}`),
      ["auth.profile", "auth.profile", "auth.login"]
    );
    assert.deepEqual(cloud.calls[2].data.payload, {
      nickname: "羊羊",
      avatarUrl: wechatAvatarUrl
    });
  } finally {
    cloud.restore();
  }
});

test("通知列表从云端通知接口读取", async () => {
  const cloud = installCloudCallMock((call) => {
    if (call.data.action === "markRead") {
      return {
        notificationId: call.data.payload.notificationId,
        read: true
      };
    }

    return [
      {
        notificationId: "notification-cloud-001",
        userId: "user-cloud-current",
        type: "system",
        title: "活动通知",
        content: "报名已确认",
        read: false,
        createdAt: "2026-05-20T10:00:00+08:00"
      }
    ];
  });

  try {
    const notifications = await getNotificationList();
    const readNotification = await markNotificationRead("notification-cloud-001");

    assert.equal(notifications[0].title, "活动通知");
    assert.equal(readNotification.read, true);
    assert.deepEqual(
      cloud.calls.map((call) => `${call.name}.${call.data.action}`),
      ["notify.list", "notify.markRead"]
    );
  } finally {
    cloud.restore();
  }
});

test("云端响应解包成功时返回 data", () => {
  const data = unwrapCloudResult<{ value: number }>({
    result: {
      ok: true,
      data: { value: 1 },
      message: "success"
    }
  });

  assert.equal(data.value, 1);
});

test("云端响应失败时抛出带 code 的错误", () => {
  assert.throws(
    () =>
      unwrapCloudResult({
        result: {
          ok: false,
          code: "PARTY_FULL",
          message: "局已满员"
        }
      }),
    (error: unknown) => error instanceof Error && (error as Error & { code?: string }).code === "PARTY_FULL"
  );
});

test("上传组局封面返回云存储 fileID", async () => {
  const calls: Array<{ cloudPath: string; filePath: string }> = [];
  (globalThis as typeof globalThis & { wx?: unknown }).wx = {
    cloud: {
      uploadFile: async (options: { cloudPath: string; filePath: string }) => {
        calls.push(options);
        return {
          fileID: "cloud://party-cover-file"
        };
      }
    }
  };

  try {
    const fileID = await uploadPartyCover("tmp/cover.JPG");

    assert.equal(fileID, "cloud://party-cover-file");
    assert.equal(calls[0].filePath, "tmp/cover.JPG");
    assert.match(calls[0].cloudPath, /^party-covers\/\d+-[a-z0-9]+\.jpg$/);
  } finally {
    (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
  }
});

test("服务配置固定为云端真实数据源", () => {
  assert.equal(serviceConfig.dataSource, "cloud");
  assert.equal(Boolean(serviceConfig.cloudEnvId), true);
});

test("腾讯地图逆地址解析城市时只需要经纬度", async () => {
  const calls: Array<{ url: string; method?: string }> = [];
  const originalMapKey = locationConfig.tencentMapKey;
  locationConfig.tencentMapKey = "map-key";
  (globalThis as typeof globalThis & { wx?: unknown }).wx = {
    request: (options: {
      url: string;
      method?: string;
      success: (response: { data: unknown }) => void;
    }) => {
      calls.push({ url: options.url, method: options.method });
      options.success({
        data: {
          status: 0,
          result: {
            address_component: {
              city: "成都市"
            }
          }
        }
      });
    }
  };

  try {
    const city = await reverseGeocodeCity(30.67, 104.06);

    assert.equal(city, "成都市");
    assert.deepEqual(calls, [
      {
        url: buildTencentMapReverseGeocoderUrl(30.67, 104.06, "map-key"),
        method: "GET"
      }
    ]);
  } finally {
    locationConfig.tencentMapKey = originalMapKey;
    (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
  }
});
