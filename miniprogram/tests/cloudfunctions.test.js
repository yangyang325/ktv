const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..", "..");

test("项目配置声明云函数根目录", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "project.config.json"), "utf8"));
  assert.equal(config.cloudfunctionRoot, "cloudfunctions/");
});

test("云函数目录完整", () => {
  ["auth", "venue", "party", "entry", "notify"].forEach((name) => {
    assert.equal(fs.existsSync(path.join(root, "cloudfunctions", name, "index.js")), true, name);
    assert.equal(
      fs.existsSync(path.join(root, "cloudfunctions", name, "package.json")),
      true,
      `${name}-package`
    );
  });
});

test("云函数声明微信云 SDK 依赖", () => {
  ["auth", "venue", "party", "entry", "notify"].forEach((name) => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, "cloudfunctions", name, "package.json"), "utf8"));
    assert.equal(packageJson.dependencies["wx-server-sdk"], "latest", `${name}-wx-server-sdk`);
  });
});

test("云函数共享后端文件完整", () => {
  ["errors.js", "response.js", "memory-store.js", "cloud-store.js", "runtime.js", "seed.js", "party-view.js"].forEach((fileName) => {
    assert.equal(fs.existsSync(path.join(root, "cloudfunctions", "shared", fileName)), true, fileName);
  });
});
