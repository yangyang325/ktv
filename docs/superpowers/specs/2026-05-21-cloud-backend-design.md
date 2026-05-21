# KTV 组局小程序云开发后端设计

## 背景

当前小程序已经完成主要前端页面和 mock 服务层，页面围绕门店浏览、发起组局、组局详情、报名确认、候补和我的组局展开。项目内已有 `cloudfunctions/auth`、`cloudfunctions/venue`、`cloudfunctions/party`、`cloudfunctions/entry`、`cloudfunctions/notify` 五个云函数目录，但它们目前只是占位实现。

后端目标是把这些占位云函数补成可用的微信云开发后端，并让前端可以在 mock 数据和云端数据之间切换。首期范围以 MVP 为准，优先打通真实登录、门店查询、组局创建发布、报名候补和通知记录。

## 方案选择

采用微信云开发云函数和云数据库作为首期后端。

这个方案最贴合当前工程结构：前端已经有云函数目录，服务层函数名也已经稳定，接入时只需要在 `services/api/*.ts` 内切换调用方式，页面层不需要大面积改造。独立 Node.js REST API 暂不采用，因为微信登录态、域名配置、部署和鉴权都会增加首期复杂度。

## 后端模块

`auth` 负责登录、获取 openid、创建或更新当前用户资料。

`venue` 负责门店列表、门店详情和门店筛选。

`party` 负责组局列表、组局详情、我的组局聚合、创建草稿和发布组局。

`entry` 负责正式报名、加入候补、退出报名，以及候补自动转正的基础逻辑。

`notify` 负责写入通知、读取通知列表和标记已读。模板消息推送在首期只预留数据结构和接口边界，不作为必须完成项。

## 云数据库集合

`users` 保存用户资料：`userId`、`openid`、`nickname`、`avatarUrl`、`createdAt`、`updatedAt`。

`venues` 保存 KTV 门店：`venueId`、`name`、`district`、`address`、`lng`、`lat`、`priceLevel`、`roomTypes`、`businessHours`、`coverImage`、`avgRating`、`isActive`、`createdAt`、`updatedAt`。

`parties` 保存组局信息：`partyId`、`title`、`venueId`、`venueCustom`、`hostId`、`startTime`、`durationMin`、`roomFee`、`maxCapacity`、`status`、`isPublic`、`notes`、`tags`、`coverImage`、`confirmedCount`、`waitlistCount`、`createdAt`、`updatedAt`、`publishedAt`。

`entries` 保存报名记录：`entryId`、`partyId`、`userId`、`userNickname`、`entryType`、`seqNo`、`waitlistNo`、`createdAt`、`confirmedAt`、`quitAt`、`removedAt`。

`notifications` 保存通知记录：`notificationId`、`userId`、`type`、`title`、`content`、`partyId`、`entryId`、`read`、`createdAt`、`readAt`。

## 接口约定

云函数统一使用 `{ action, payload }` 入参。每个云函数只处理自身模块的 action。

成功响应统一为 `{ ok: true, data, message: "success" }`。

失败响应统一为 `{ ok: false, code, message }`。

首批错误码包括：`UNAUTHORIZED`、`NOT_FOUND`、`VALIDATION_ERROR`、`PARTY_FULL`、`DUPLICATE_ENTRY`、`PARTY_NOT_RECRUITING`、`INTERNAL_ERROR`。

## 主要动作

`auth.login` 通过云函数上下文读取 openid，若用户不存在则创建默认用户，若已存在则返回现有用户。

`auth.profile` 返回当前用户资料。

`venue.list` 支持按 `district`、`keyword`、`priceLevel` 筛选启用门店。

`venue.detail` 按 `venueId` 返回门店详情。

`party.list` 返回未结束、未取消且可展示的组局列表，并补齐前端需要的展示字段。

`party.detail` 返回组局详情、发起人、已确认报名、候补列表和当前用户报名状态。

`party.myTabs` 返回 `hosting`、`joined`、`waitlist`、`history` 四组数据。

`party.createDraft` 校验表单输入，创建草稿组局，发起人自动占 1 个正式名额。

`party.publish` 将草稿发布为招募中。

`entry.join` 校验登录、组局状态、重复报名和剩余名额，通过后创建正式报名记录。

`entry.waitlist` 校验登录、重复报名和组局有效性，通过后创建候补记录。

`entry.quit` 将正式报名或候补记录标记为退出；如果正式报名退出后存在候补，则自动把最早候补转为正式报名。

`notify.list` 返回当前用户通知列表。

`notify.markRead` 标记单条通知已读。

## 业务规则

只有 `recruiting` 状态的组局允许正式报名和候补。

同一用户在同一组局只能存在一条有效报名记录，`confirmed` 和 `waitlist` 都算有效记录。

正式报名人数达到 `maxCapacity` 后，组局状态更新为 `full`。候补不改变正式报名人数。

正式报名退出后，如果存在候补，则按 `waitlistNo` 最小的记录自动转正，并重新计算正式序号和候补序号。

发起人创建草稿时自动生成一条正式报名记录，避免详情页和接龙文案出现 0 人发起的状态。

所有金额以分为单位保存，展示时由前端或云函数格式化为元。

## 前端接入

保留现有 `getPartyList`、`getPartyDetail`、`getMyPartyTabs`、`createPartyDraft`、`publishParty`、`joinParty`、`joinWaitlist`、`getVenueList`、`getCurrentUser` 等服务层函数名。

`serviceConfig.dataSource` 继续作为数据源开关。`mock` 模式保持现有行为，`cloud` 模式通过 `wx.cloud.callFunction` 调用对应云函数。

页面层只在必要位置补当前用户 ID 的来源，不重写页面流程。

## 测试策略

先为云函数核心业务增加 Node 测试，覆盖门店筛选、创建草稿、发布组局、正式报名、重复报名、满员候补、退出后候补转正和我的组局聚合。

再运行现有前端测试，确保 mock 模式不被云端接入破坏。

测试数据使用内存版数据库适配器或轻量 fake database，避免本地测试依赖真实云环境。

## 非目标

首期不实现在线支付。

首期不实现真实模板消息推送，只落通知记录。

首期不实现后台管理系统。

首期不做跨城市、多商户和复杂权限体系。

## 实施顺序

先建立云函数通用响应、错误处理、时间和展示字段格式化工具。

再补 `venue` 和 `auth`，因为它们是低风险基础能力。

然后实现 `party` 的查询、详情、草稿和发布。

最后实现 `entry` 的报名、候补、退出和候补转正，并补 `notify` 的通知记录。
