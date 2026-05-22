/**
 * 深拷贝纯数据。
 * @param {unknown} value 原始数据
 * @returns {unknown} 克隆数据
 */
function clonePlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 判断文档是否匹配查询条件。
 * @param {object} item 文档
 * @param {Function | object | undefined} selector 查询条件
 * @returns {boolean} 是否匹配
 */
function matchesSelector(item, selector) {
  if (!selector) {
    return true;
  }

  if (typeof selector === "function") {
    return selector(item);
  }

  return Object.keys(selector).every((key) => item[key] === selector[key]);
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
     * @param {Function | object} selector 查询条件
     * @returns {Promise<object[]>} 数据列表
     */
    async list(collection, selector) {
      return (state[collection] || []).filter((item) => matchesSelector(item, selector)).map(clonePlainValue);
    },

    /**
     * 查找单条数据。
     * @param {string} collection 集合名
     * @param {Function | object} selector 查询条件
     * @returns {Promise<object | null>} 单条数据
     */
    async findOne(collection, selector) {
      const item = (state[collection] || []).find((entry) => matchesSelector(entry, selector));
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
     * @param {Function | object} selector 查询条件
     * @param {(item: object) => object} updater 更新函数
     * @returns {Promise<object | null>} 更新后的文档
     */
    async updateOne(collection, selector, updater) {
      const items = state[collection] || [];
      const index = items.findIndex((item) => matchesSelector(item, selector));

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
  matchesSelector,
  createMemoryStore
};
