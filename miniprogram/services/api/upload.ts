/**
 * 获取图片文件扩展名。
 * @param filePath 临时文件路径
 * @returns 规范化后的扩展名
 */
function getImageExtension(filePath: string): string {
  const cleanPath = filePath.split("?")[0].toLowerCase();
  const match = cleanPath.match(/\.(png|jpe?g|webp|gif)$/);

  if (!match) {
    return "jpg";
  }

  return match[1] === "jpeg" ? "jpg" : match[1];
}

/**
 * 创建图片云存储路径。
 * @param directory 云存储目录
 * @param filePath 临时文件路径
 * @returns 云存储路径
 */
function createImageCloudPath(directory: string, filePath: string): string {
  const extension = getImageExtension(filePath);
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${directory}/${Date.now()}-${suffix}.${extension}`;
}

/**
 * 上传图片到云存储。
 * @param directory 云存储目录
 * @param filePath 本地临时图片路径
 * @returns 云存储 fileID
 */
async function uploadImageFile(directory: string, filePath: string): Promise<string> {
  if (!filePath) {
    return "";
  }

  if (typeof wx === "undefined" || !wx.cloud || !wx.cloud.uploadFile) {
    throw new Error("当前环境不支持云存储上传");
  }

  const result = await wx.cloud.uploadFile({
    cloudPath: createImageCloudPath(directory, filePath),
    filePath
  });

  return result.fileID;
}

/**
 * 上传组局封面。
 * @param filePath 本地临时图片路径
 * @returns 可保存到组局数据的图片地址
 */
export async function uploadPartyCover(filePath: string): Promise<string> {
  return uploadImageFile("party-covers", filePath);
}
