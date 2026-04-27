const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..", "..");

test("UI 参考图已放入项目文档资源", () => {
  const files = [
    "docs/ui-reference/ktv-ui-overview.png",
    "docs/ui-reference/ktv-ui-home-detail.png"
  ];

  files.forEach((filePath) => {
    assert.equal(fs.existsSync(path.join(root, filePath)), true, filePath);
  });
});
