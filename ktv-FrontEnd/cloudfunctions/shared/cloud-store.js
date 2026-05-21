const { clonePlainValue } = require("./memory-store");

/**
 * 判断文档是否匹配查询条件。
 * @param {object} item 文档
 * @param {Function | object | undefined} predicate 查询条件
 * @returns {boolean} 是否匹配
 */
function matchesPredicate(item, predicate) {
  if (!predicate) {
    return true;
  }

  if (typeof predicate === "function") {
    return predicate(item);
  }

  return Object.keys(predicate).every((key) => item[key] === predicate[key]);
}

/**
 * 读取集合查询结果。
 * @param {object} db 云数据库
 * @param {string} collection 集合名
 * @param {Function | object | undefined} predicate 查询条件
 * @returns {Promise<object[]>} 查询结果
 */
async function fetchCollectionData(db, collection, predicate) {
  const query = typeof predicate === "object" && predicate
    ? db.collection(collection).where(predicate)
    : db.collection(collection);
  const result = await query.get();
  return (result.data || []).filter((item) => matchesPredicate(item, predicate));
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
     * @param {Function | object} predicate 查询条件
     * @returns {Promise<object[]>} 数据列表
     */
    async list(collection, predicate = () => true) {
      const data = await fetchCollectionData(db, collection, predicate);
      return data.map(clonePlainValue);
    },

    /**
     * 查找单条数据。
     * @param {string} collection 集合名
     * @param {Function | object} predicate 查询条件
     * @returns {Promise<object | null>} 单条数据
     */
    async findOne(collection, predicate) {
      const data = await fetchCollectionData(db, collection, predicate);
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
     * @param {Function | object} predicate 查询条件
     * @param {(item: object) => object} updater 更新函数
     * @returns {Promise<object | null>} 更新后的文档
     */
    async updateOne(collection, predicate, updater) {
      const current = await this.findOne(collection, predicate);

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
