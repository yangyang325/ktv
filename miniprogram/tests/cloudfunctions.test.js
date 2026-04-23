const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..", "..");

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
