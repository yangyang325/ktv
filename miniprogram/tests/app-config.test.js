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
    "pages/my-parties/index",
    "pages/launch/index",
    "pages/profile/index",
    "pages/party-detail/index",
    "pages/common/webview/index"
  ]);
});

test("底部导航包含四个入口", () => {
  assert.equal(appConfig.tabBar.list.length, 4);
});
