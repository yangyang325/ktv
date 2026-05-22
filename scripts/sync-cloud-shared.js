const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "cloudfunctions", "shared");
const cloudFunctionNames = ["auth", "venue", "party", "entry", "notify"];

/**
 * 读取共享模块文件列表。
 * @returns {string[]} 共享模块文件名列表
 */
function listSharedFiles() {
  return fs.readdirSync(sourceDir).filter((fileName) => fileName.endsWith(".js")).sort();
}

/**
 * 准备目标目录。
 * @param {string} targetDir 目标目录
 */
function prepareTargetDir(targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
}

/**
 * 判断文件内容是否一致。
 * @param {string} leftPath 左侧文件路径
 * @param {string} rightPath 右侧文件路径
 * @returns {boolean} 是否一致
 */
function hasSameContent(leftPath, rightPath) {
  if (!fs.existsSync(rightPath)) {
    return false;
  }

  return fs.readFileSync(leftPath, "utf8") === fs.readFileSync(rightPath, "utf8");
}

/**
 * 同步共享模块到单个云函数目录。
 * @param {string} functionName 云函数名称
 * @param {{ check: boolean }} options 同步选项
 * @returns {string[]} 不一致的文件路径
 */
function syncSharedToFunction(functionName, options) {
  const targetDir = path.join(root, "cloudfunctions", functionName, "shared");
  const sharedFiles = listSharedFiles();
  const mismatches = [];

  if (!options.check) {
    prepareTargetDir(targetDir);
  }

  for (const fileName of sharedFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const targetPath = path.join(targetDir, fileName);

    if (options.check) {
      if (!hasSameContent(sourcePath, targetPath)) {
        mismatches.push(path.relative(root, targetPath));
      }
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }

  return mismatches;
}

/**
 * 执行共享模块同步或校验。
 */
function main() {
  const check = process.argv.includes("--check");
  const mismatches = cloudFunctionNames.flatMap((functionName) => syncSharedToFunction(functionName, { check }));

  if (check && mismatches.length > 0) {
    console.error("云函数共享模块未同步：");
    mismatches.forEach((filePath) => console.error(`- ${filePath}`));
    process.exitCode = 1;
    return;
  }

  if (!check) {
    console.log("云函数共享模块已同步");
  }
}

main();
