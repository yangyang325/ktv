/**
 * 深拷贝纯数据。
 * @param {unknown} value 原始数据
 * @returns {unknown} 克隆数据
 */
function clonePlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 创建内存数据存储。
 * @param {Record<string, unknown[]>} seed 初始数据
 * @returns {object} 数据存储
 */
function createMemoryStore(seed = {}) {
  const state = clonePlainValue(seed);

  return {
    /**
     * 列出集合数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @returns {Promise<object[]>} 数据列表
     */
    async list(collection, predicate = () => true) {
      return (state[collection] || []).filter(predicate).map(clonePlainValue);
    },

    /**
     * 查找单条数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @returns {Promise<object | null>} 单条数据
     */
    async findOne(collection, predicate) {
      const item = (state[collection] || []).find(predicate);
      return item ? clonePlainValue(item) : null;
    },

    /**
     * 插入数据。
     * @param {string} collection 集合名
     * @param {object} document 文档
     * @returns {Promise<object>} 插入后的文档
     */
    async insert(collection, document) {
      state[collection] = state[collection] || [];
      const nextDocument = clonePlainValue(document);
      state[collection].push(nextDocument);
      return clonePlainValue(nextDocument);
    },

    /**
     * 更新第一条匹配数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @param {(item: object) => object} updater 更新函数
     * @returns {Promise<object | null>} 更新后的文档
     */
    async updateOne(collection, predicate, updater) {
      const items = state[collection] || [];
      const index = items.findIndex(predicate);

      if (index < 0) {
        return null;
      }

      items[index] = { ...items[index], ...updater(clonePlainValue(items[index])) };
      return clonePlainValue(items[index]);
    },

    /**
     * 读取内部状态快照。
     * @returns {Record<string, unknown[]>} 状态快照
     */
    snapshot() {
      return clonePlainValue(state);
    }
  };
}

module.exports = {
  clonePlainValue,
  createMemoryStore
};
