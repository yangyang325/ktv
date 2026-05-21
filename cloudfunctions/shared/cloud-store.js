const { clonePlainValue, matchesSelector } = require("./memory-store");

/**
 * 判断查询条件是否可下推到云数据库。
 * @param {Function | object | undefined} selector 查询条件
 * @returns {boolean} 是否可下推
 */
function isObjectSelector(selector) {
  return Boolean(selector) && typeof selector === "object" && !Array.isArray(selector);
}

/**
 * 读取集合查询结果。
 * @param {object} db 云数据库
 * @param {string} collection 集合名
 * @param {Function | object | undefined} selector 查询条件
 * @returns {Promise<object[]>} 查询结果
 */
async function fetchCollectionData(db, collection, selector) {
  const query = isObjectSelector(selector)
    ? db.collection(collection).where(selector)
    : db.collection(collection);
  const result = await query.get();
  return (result.data || []).filter((item) => matchesSelector(item, selector));
}

/**
 * 创建云数据库存储。
 * @param {object} db 微信云数据库实例
 * @returns {object} 数据存储
 */
function createCloudStore(db) {
  return {
    /**
     * 列出集合数据。
     * @param {string} collection 集合名
     * @param {Function | object} selector 查询条件
     * @returns {Promise<object[]>} 数据列表
     */
    async list(collection, selector) {
      const data = await fetchCollectionData(db, collection, selector);
      return data.map(clonePlainValue);
    },

    /**
     * 查找单条数据。
     * @param {string} collection 集合名
     * @param {Function | object} selector 查询条件
     * @returns {Promise<object | null>} 单条数据
     */
    async findOne(collection, selector) {
      const data = await fetchCollectionData(db, collection, selector);
      return data[0] ? clonePlainValue(data[0]) : null;
    },

    /**
     * 插入数据。
     * @param {string} collection 集合名
     * @param {object} document 文档
     * @returns {Promise<object>} 插入后的文档
     */
    async insert(collection, document) {
      const nextDocument = clonePlainValue(document);
      const result = await db.collection(collection).add({ data: nextDocument });
      return clonePlainValue({ ...nextDocument, _id: result._id });
    },

    /**
     * 更新第一条匹配数据。
     * @param {string} collection 集合名
     * @param {Function | object} selector 查询条件
     * @param {(item: object) => object} updater 更新函数
     * @returns {Promise<object | null>} 更新后的文档
     */
    async updateOne(collection, selector, updater) {
      const current = await this.findOne(collection, selector);

      if (!current) {
        return null;
      }

      const patch = updater(clonePlainValue(current));
      const id = current._id || current.id;
      await db.collection(collection).doc(id).update({ data: patch });
      return clonePlainValue({ ...current, ...patch });
    }
  };
}

module.exports = {
  createCloudStore
};
