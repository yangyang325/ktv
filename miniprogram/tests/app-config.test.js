const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const appConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "app.json"), "utf8")
);

test("主包页面已注册", () => {
  assert.deepEqual(appConfig.pages, [
    "pages/home/index",
    "pages/discover/index",
    "pages/messages/index",
    "pages/profile/index",
    "pages/profile-edit/index",
    "pages/favorites/index",
    "pages/my-parties/index",
    "pages/launch/index",
    "pages/party-detail/index",
    "pages/common/webview/index"
  ]);
});

test("底部导航按 UI 图包含四个入口", () => {
  assert.equal(appConfig.tabBar.list.length, 4);
  assert.deepEqual(
    appConfig.tabBar.list.map((item) => item.text),
    ["首页", "发现", "消息", "我的"]
  );
  assert.deepEqual(
    appConfig.tabBar.list.map((item) => item.pagePath),
    ["pages/home/index", "pages/discover/index", "pages/messages/index", "pages/profile/index"]
  );
});

test("首页和发布活动位置选择声明位置权限", () => {
  const permissionDesc = appConfig.permission["scope.userLocation"].desc;

  assert.equal(permissionDesc.includes("首页"), true);
  assert.equal(permissionDesc.includes("K歌活动地点"), true);
  assert.deepEqual(new Set(appConfig.requiredPrivateInfos), new Set(["chooseLocation"]));
});
