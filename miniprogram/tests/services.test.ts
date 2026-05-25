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
  getFavoritePartyIds,
  isPartyFavorited,
  removeFavoriteParty,
  togglePartyFavorite
} from "../services/api/favorite";
import { unwrapCloudResult } from "../services/api/cloud";
import {
  buildTencentMapReverseGeocoderUrl,
  reverseGeocodeCity
} from "../services/api/location";
import { uploadPartyCover } from "../services/api/upload";
import { PARTY_DEFAULT_COVER_IMAGES } from "../constants/assets";
import * as userApi from "../services/api/user";
import { getCurrentUser } from "../services/api/user";
import { locationConfig, serviceConfig } from "../services/config";

const initialServiceConfig = { ...serviceConfig };

/**
 * 切换服务测试到本地模拟数据源。
 */
function useMockDataSource() {
  serviceConfig.dataSource = "mock";
}

test("首页列表返回可展示的局数据", async () => {
  useMockDataSource();

  const parties = await getPartyList();
  assert.equal(Array.isArray(parties), true);
  assert.equal(parties.length > 0, true);
  assert.equal(typeof parties[0].estimatedPerPerson, "number");
  assert.deepEqual(
    parties[0].participantAvatars.map((item) => item.avatarUrl),
    [
      "https://example.com/avatar-host.png",
      "https://example.com/avatar-aming.png",
      "https://example.com/avatar-xiaoqiu.png"
    ]
  );
});

test("首页局卡片使用线上封面图", async () => {
  useMockDataSource();

  const parties = await getPartyList();
  const coverImage = parties[0].coverImage;
  assert.equal(
    coverImage,
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/yqgl5umpgadjkt.jpg"
  );
  assert.equal(parties.every((party) => party.coverImage.startsWith("https://wechatapppro-1252524126.cdn.xiaoeknow.com/")), true);
  assert.equal(parties.some((party) => party.coverImage.includes("/assets/images/ktv/ktv-room-")), false);
});

test("我的局聚合视图包含四个分组", async () => {
  useMockDataSource();

  const tabs = await getMyPartyTabs("user-host");
  assert.deepEqual(Object.keys(tabs), ["hosting", "joined", "waitlist", "history"]);
});

test("mock 当前用户返回真实用户资料", async () => {
  useMockDataSource();

  const user = await getCurrentUser();
  assert.equal(user.nickname, "羊羊");
  assert.equal(user.avatarUrl, "https://example.com/avatar-host.png");
});

test("mock 当前用户资料更新后再次读取到编辑结果", async () => {
  useMockDataSource();
  const updateCurrentUser = (userApi as typeof userApi & {
    updateCurrentUser?: (profile: {
      avatarUrl?: string;
      intro?: string;
      nickname?: string;
    }) => Promise<{ avatarUrl: string; intro?: string; nickname: string }>;
  }).updateCurrentUser;

  assert.equal(typeof updateCurrentUser, "function");

  await updateCurrentUser({
    nickname: "羊羊新版",
    avatarUrl: "temp/profile-avatar.png",
    intro: "喜欢粤语老歌"
  });
  const user = await getCurrentUser();

  assert.equal(user.nickname, "羊羊新版");
  assert.equal(user.avatarUrl, "temp/profile-avatar.png");
  assert.equal((user as typeof user & { intro?: string }).intro, "喜欢粤语老歌");
});

test("局详情能返回报名与候补人数", async () => {
  useMockDataSource();

  const detail = await getPartyDetail("party-001");
  assert.equal(detail.party.partyId, "party-001");
  assert.equal(detail.confirmedEntries.length > 0, true);
  assert.equal(detail.party.venueAddress, "深圳市南山区海岸城东座 3 楼");
  assert.equal(detail.party.venueLatitude, 22.53);
  assert.equal(detail.party.venueLongitude, 113.934);
});

test("活动收藏服务支持收藏取消并返回收藏活动", async () => {
  useMockDataSource();
  removeFavoriteParty("party-001");

  assert.equal(isPartyFavorited("party-001"), false);
  assert.equal(togglePartyFavorite("party-001"), true);
  assert.equal(isPartyFavorited("party-001"), true);
  assert.equal(getFavoritePartyIds()[0], "party-001");

  const favoriteParties = await getFavoriteParties();
  assert.equal(favoriteParties.some((party) => party.partyId === "party-001"), true);

  assert.equal(togglePartyFavorite("party-001"), false);
  assert.equal(isPartyFavorited("party-001"), false);
});

test("发起流程可以创建并发布草稿", async () => {
  useMockDataSource();

  const draft = await createPartyDraft({
    title: "羊羊周六 K 局",
    venueId: "venue-001",
    venueSummary: "MUSE KTV · 南山区",
    startDate: "2026-04-27",
    startTime: "19:30",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 12,
    notes: "欢迎新人，不限歌路。",
    tags: ["欢迎新人"],
    venueAddress: "深圳市南山区海岸城东座 3 楼",
    venueLatitude: 22.53,
    venueLongitude: 113.934
  });
  const published = await publishParty(draft.partyId);
  assert.equal(published.status, "recruiting");
  assert.equal(published.venueLatitude, 22.53);
  assert.equal(published.venueLongitude, 113.934);
});

test("未上传封面时本地草稿随机使用默认封面池", async () => {
  useMockDataSource();
  const originalRandom = Math.random;
  Math.random = () => 0.99;

  try {
    const draft = await createPartyDraft({
      title: "羊羊默认封面 K 局",
      venueId: "venue-001",
      venueSummary: "MUSE KTV · 南山",
      startDate: "2026-04-28",
      startTime: "20:00",
      durationMin: 180,
      roomFee: 240000,
      maxCapacity: 10,
      notes: "测试默认封面",
      tags: ["欢迎新人"]
    });

    assert.deepEqual(PARTY_DEFAULT_COVER_IMAGES, [
      "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/l2qwjsmpgadjl5.jpg",
      "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/yqgl5umpgadjkt.jpg",
      "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/r9yyqgmpgadjl8.jpg"
    ]);
    assert.equal(draft.coverImage, PARTY_DEFAULT_COVER_IMAGES[2]);
  } finally {
    Math.random = originalRandom;
  }
});

test("报名满员后进入候补", async () => {
  useMockDataSource();

  const contactInfo = {
    method: "wechat" as const,
    value: "aming-sing",
    arrivalTime: "19:20",
    note: "到店后等群通知"
  };
  const joined = await joinParty("party-002", "user-guest-1", contactInfo);
  assert.equal(joined.entryType, "confirmed");
  assert.deepEqual(joined.contactInfo, contactInfo);
  const waitlist = await joinWaitlist("party-003", "user-guest-2");
  assert.equal(waitlist.entryType, "waitlist");
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

test("mock 模式上传组局封面返回本地临时路径", async () => {
  serviceConfig.dataSource = "mock";

  const filePath = await uploadPartyCover("temp/party-cover.png");

  assert.equal(filePath, "temp/party-cover.png");
});

test("cloud 模式上传组局封面返回云存储 fileID", async () => {
  const calls: Array<{ cloudPath: string; filePath: string }> = [];
  const originalWx = (globalThis as typeof globalThis & { wx?: unknown }).wx;
  serviceConfig.dataSource = "cloud";
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
    serviceConfig.dataSource = "mock";
    (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
  }
});

test("服务配置已切到云端模式", () => {
  assert.equal(initialServiceConfig.dataSource, "cloud");
  assert.equal(Boolean(initialServiceConfig.cloudEnvId), true);
});

test("云端受保护服务不转发 mock 用户 ID", async () => {
  const calls: Array<{ name: string; data: { action: string; payload: Record<string, unknown> } }> = [];
  const originalWx = (globalThis as typeof globalThis & { wx?: unknown }).wx;
  serviceConfig.dataSource = "cloud";
  (globalThis as typeof globalThis & { wx?: unknown }).wx = {
    cloud: {
      callFunction: async (options: { name: string; data: { action: string; payload: Record<string, unknown> } }) => {
        calls.push(options);
        return {
          result: {
            ok: true,
            data: {},
            message: "success"
          }
        };
      }
    }
  };

  try {
    await getMyPartyTabs("user-host");
    await createPartyDraft({
      title: "云端测试局",
      venueId: "venue-001",
      venueSummary: "MUSE KTV · 南山",
      startDate: "2026-05-23",
      startTime: "19:30",
      durationMin: 180,
      roomFee: 240000,
      maxCapacity: 12,
      notes: "测试",
      tags: [],
      coverImage: "cloud://party-cover-file",
      venueAddress: "深圳市南山区测试地址",
      venueLatitude: 22.53,
      venueLongitude: 113.934
    });
    await joinParty("party-001", "user-guest-1", {
      method: "wechat",
      value: "aming-sing",
      arrivalTime: "19:20",
      note: "到店后等群通知"
    });
    await joinWaitlist("party-001", "user-wait-1");
  } finally {
    serviceConfig.dataSource = "mock";
    (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
  }

  assert.deepEqual(
    calls.map((call) => call.data.action),
    ["myTabs", "createDraft", "join", "waitlist"]
  );
  assert.equal(calls.some((call) => "userId" in call.data.payload), false);
  assert.equal(
    calls.find((call) => call.data.action === "createDraft")?.data.payload.coverImage,
    "cloud://party-cover-file"
  );
  assert.equal(
    calls.find((call) => call.data.action === "createDraft")?.data.payload.venueLatitude,
    22.53
  );
  assert.deepEqual(calls.find((call) => call.data.action === "join")?.data.payload.contactInfo, {
    method: "wechat",
    value: "aming-sing",
    arrivalTime: "19:20",
    note: "到店后等群通知"
  });
});

test("腾讯地图逆地址解析城市时只需要经纬度", async () => {
  const calls: Array<{ url: string; method?: string }> = [];
  const originalWx = (globalThis as typeof globalThis & { wx?: unknown }).wx;
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
