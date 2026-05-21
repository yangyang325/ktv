/**
 * 数据源类型。
 */
export type DataSource = "mock" | "cloud";

/**
 * 数据源配置。
 */
export const serviceConfig = {
  dataSource: "mock" as DataSource,
  cloudEnvId: ""
};
