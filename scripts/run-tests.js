const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

/**
 * 读取所有测试文件，避免 Windows shell 不展开 glob。
 * @returns {string[]} 测试文件路径列表
 */
function listTestFiles() {
  const testDir = join(__dirname, "..", "miniprogram", "tests");
  return readdirSync(testDir)
    .filter((fileName) => fileName.endsWith(".test.js") || fileName.endsWith(".test.ts"))
    .sort()
    .map((fileName) => join(testDir, fileName));
}

/**
 * 运行项目测试。
 * @returns {number} 测试进程退出码
 */
function runTests() {
  const result = spawnSync("npx", ["tsx", "--test", ...listTestFiles()], {
    cwd: join(__dirname, ".."),
    shell: true,
    stdio: "inherit"
  });

  return result.status ?? 1;
}

process.exitCode = runTests();
