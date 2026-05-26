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

test("底部导航暂时隐藏消息入口但保留消息页注册", () => {
  assert.equal(appConfig.pages.includes("pages/messages/index"), true);
  assert.equal(appConfig.tabBar.list.length, 3);
  assert.deepEqual(
    appConfig.tabBar.list.map((item) => item.text),
    ["首页", "发现", "我的"]
  );
  assert.deepEqual(
    appConfig.tabBar.list.map((item) => item.pagePath),
    ["pages/home/index", "pages/discover/index", "pages/profile/index"]
  );
});

test("创建活动子包不再注册接龙预览页", () => {
  const createPackage = appConfig.subpackages.find((subpackage) => subpackage.root === "packageCreate");

  assert.deepEqual(createPackage.pages, ["pages/venue-picker/index", "pages/party-form/index"]);
  assert.equal(JSON.stringify(appConfig.subpackages).includes("party-preview"), false);
});

test("发布活动位置选择声明位置权限", () => {
  const permissionDesc = appConfig.permission["scope.userLocation"].desc;

  assert.equal(permissionDesc.includes("首页"), false);
  assert.equal(permissionDesc.includes("K歌活动地点"), true);
  assert.deepEqual(new Set(appConfig.requiredPrivateInfos), new Set(["chooseLocation"]));
});
