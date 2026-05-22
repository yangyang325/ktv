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
import { unwrapCloudResult } from "../services/api/cloud";
import {
  buildTencentMapReverseGeocoderUrl,
  reverseGeocodeCity
} from "../services/api/location";
import { uploadPartyCover } from "../services/api/upload";
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

test("局详情能返回报名与候补人数", async () => {
  useMockDataSource();

  const detail = await getPartyDetail("party-001");
  assert.equal(detail.party.partyId, "party-001");
  assert.equal(detail.confirmedEntries.length > 0, true);
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
    tags: ["欢迎新人"]
  });
  const published = await publishParty(draft.partyId);
  assert.equal(published.status, "recruiting");
});

test("报名满员后进入候补", async () => {
  useMockDataSource();

  const joined = await joinParty("party-002", "user-guest-1");
  assert.equal(joined.entryType, "confirmed");
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
      coverImage: "cloud://party-cover-file"
    });
    await joinParty("party-001", "user-guest-1");
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
