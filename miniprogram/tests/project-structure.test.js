const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..", "..");

test("核心工程配置文件存在", () => {
  const requiredFiles = [
    ".gitignore",
    "package.json",
    "tsconfig.json",
    "project.config.json",
    "miniprogram/app.json",
    "miniprogram/app.ts",
    "miniprogram/app.wxss"
  ];

  requiredFiles.forEach((filePath) => {
    assert.equal(fs.existsSync(path.join(root, filePath)), true, filePath);
  });
});
