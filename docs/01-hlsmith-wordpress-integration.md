# HLSmith WordPress 集成方案

## 目标
- HLSmith 作为主数据源，管理合集/集数、播放可用性与学习时长统计。
- WordPress 负责展示与调用授权接口，小程序通过 API 拉取并上报。
- 动态 HLS URL 24h 有效，主要用于播放可用性校验，不绑定用户。
- viewer_key 24h 有效，用于学习时长统计。

## 身份体系 (不接入 HLSmith 用户)
- viewer_key 由 WordPress 插件服务端生成并下发。
- 建议格式:
  - viewer_key = base64(userId.issuedAt.ttl.signature)
  - signature = HMAC_SHA256(userId|issuedAt|ttl, shared_secret)
- HLSmith 校验:
  - HMAC 正确
  - issuedAt + ttl 未过期
- shared_secret 仅存于 WP 服务端，小程序只拿 viewer_key。

## 数据模型 (HLSmith)

### collections
- id
- title
- description
- cover
- created_at
- updated_at

### collection_items
- id
- collection_id
- video_id
- title
- sort_order
- available_from (nullable)
- available_until (nullable)
- created_at
- updated_at

### watch_sessions
- id
- viewer_key
- collection_item_id
- video_id
- total_seconds
- last_heartbeat_at
- created_at
- updated_at
- 唯一索引: (viewer_key, collection_item_id)

## 可播放规则 (上下架时间)
- available_from 为空: 不限制开始时间
- available_until 为空: 不限制结束时间
- 二者皆空: 始终可播
- 二者皆有: 仅在区间内可播
- 判定: now 必须落在允许范围内

## API 设计 (HLSmith)

### 合集与列表
- GET /api/collections
- GET /api/collections/:id
  - 返回 collection_items, 包含 available_from, available_until

### 播放授权与动态 HLS
- POST /api/playback/authorize
  - 入参: viewer_key, collection_item_id
  - 校验: viewer_key 合法 + 时间窗
  - 返回:
    - playable
    - available_from, available_until
    - playback_token (playable=true 时)

- GET /api/playback/stream/:token
  - token 24h 有效
  - 每次请求再校验时间窗是否可播
  - 返回 HLS playlist/segment
  - 不绑定 viewer_key

### 学习时长心跳
- POST /api/watch/heartbeat
  - 入参: viewer_key, collection_item_id, delta_seconds, playhead, timestamp
  - 规则:
    - 心跳间隔 >= 15s
    - delta_seconds 上限 20
    - timestamp 与服务器偏差 <= 2 分钟
  - 成功则累加 watch_sessions.total_seconds

### 学习时长统计
- GET /api/watch/summary?viewer_key=...
  - 返回:
    - total_seconds
    - collections[] (合集级汇总)
    - items[] (单集汇总)

## 前端/小程序播放流程

### WordPress 页面
1) GET /api/collections
2) GET /api/collections/:id (展示可观看时间)
3) 点击播放: POST /api/playback/authorize
4) 可播放: 使用 playback_token 启动 HLS 播放
5) 播放器每 15s 上报 POST /api/watch/heartbeat

### 小程序
- 同样走 authorize + heartbeat + summary (由 WP 插件透出或直连 HLSmith)

## WordPress 集成补充 (文章=合集)
- 文章与合集映射: 在 WP 文章增加自定义字段 `hlsmith_collection_id` 绑定 HLSmith collection
- 页面结构: 文章内嵌播放器 + 播放列表容器, 不再手动插入多条 HLS 链接
- 播放列表来源: 根据 `hlsmith_collection_id` 调用 collections/:id 动态渲染

## WordPress 插件中转模式
- HLSmith API 不直接暴露给前端或小程序
- 统一由 WP 插件提供中转 API (命名空间示例: /wp-json/hlsmith/v1)
- /authorize 接口二次校验: 必须登录 + 已购课程, 避免绕过前端

## 前端与小程序的通用逻辑
- 抽象通用函数: fetchCollections, fetchCollectionDetail, authorizePlayback, sendHeartbeat
- 网页端使用 AJAX 适配, 小程序使用 request 适配
- 两端复用统一的 API 响应结构

## 迁移说明 (从旧模式过渡)
- 旧模式: 文章内手动插多条 HLS 链接
- 新模式: 文章只绑定 collection_id, 列表与播放地址动态获取
- 可按课程逐步迁移, 新旧模式短期可并存

## 错误返回约定
- 不可播放: playable=false + 返回可播放时间
- viewer_key 过期或非法: 401 + error_code=INVALID_VIEWER_KEY
- 未到播放时间: 403 + error_code=NOT_AVAILABLE_YET
- 已过下架时间: 403 + error_code=EXPIRED

## 时区建议
- 所有时间字段统一用 UTC 存储
- 接口返回 ISO 8601 (带 Z)

## 开发方案 (先 HLSmith, 后 WordPress)

### 阶段 1: HLSmith
- 完成数据模型: collections, collection_items, watch_sessions
- 实现可播放时间窗判断与 viewer_key 验签 (HMAC + 过期)
- 实现核心 API:
  - GET /api/collections
  - GET /api/collections/:id
  - POST /api/playback/authorize
  - GET /api/playback/stream/:token
  - POST /api/watch/heartbeat
  - GET /api/watch/summary
- 统一错误码与返回结构
- 打通全链路: authorize -> stream -> heartbeat -> summary

### 阶段 1.5: HLSmith 管理后台前端
- 使用现有前端 UI 框架与设计风格 (Next.js + shadcn/ui New York)
- 管理后台核心页面:
  - 合集管理: 列表/创建/编辑/删除
  - 合集详情: 集数列表、排序、上下架时间、绑定视频
  - 集数管理: 新增/编辑/删除、可播时间窗配置
  - 播放可用性检查: 输入 viewer_key + collection_item_id -> 调用 authorize 显示结果
  - 学习时长查询: 输入 viewer_key -> 调用 summary 显示汇总
- 前端对接 API:
  - GET /api/collections
  - GET /api/collections/:id
  - POST /api/collections (若已有)
  - PATCH /api/collections/:id (若已有)
  - DELETE /api/collections/:id (若已有)
  - POST /api/collection-items (若已有)
  - PATCH /api/collection-items/:id (若已有)
  - DELETE /api/collection-items/:id (若已有)
  - POST /api/playback/authorize
  - GET /api/watch/summary
- 表单与校验:
  - 标题必填，sort_order 为整数
  - available_from/available_until 允许空；有值时需满足 from <= until
  - 时间字段统一显示本地时区，保存为 UTC
- 交互细节:
  - 列表支持搜索/分页 (若有现成组件则复用)
  - 保存/删除有确认与成功提示
  - 授权检查与统计查询区块独立，不影响数据管理流程

### 阶段 2: WordPress 插件
- 插件配置: HLSmith Base URL + shared_secret
- 文章自定义字段: hlsmith_collection_id
- 中转 API (命名空间示例: /wp-json/hlsmith/v1):
  - GET /collections
  - GET /collections/:id
  - POST /authorize (二次校验: 登录 + 已购)
  - POST /heartbeat
- 文章页前端: 播放列表渲染 + authorize + 播放 + heartbeat
- 小程序端: 复用 WP API, 用请求适配层接入

## 开发任务 Todo

### HLSmith
- [x] 设计/创建数据表: collections, collection_items, watch_sessions
- [x] 实现可播放时间窗判断工具函数
- [x] 实现 viewer_key 验签逻辑 (HMAC + 过期)
- [x] 实现 GET /api/collections
- [x] 实现 GET /api/collections/:id (含 items 与可播时间)
- [x] 实现 POST /api/playback/authorize
- [x] 实现 GET /api/playback/stream/:token
- [x] 实现 POST /api/watch/heartbeat
- [x] 实现 GET /api/watch/summary
- [x] 统一错误码与错误结构
- [x] 全链路验证 (authorize -> stream -> heartbeat -> summary)

### HLSmith 管理后台前端
- [ ] 合集列表页: 查询/创建/编辑/删除
- [ ] 合集详情页: 集数列表、排序、时间窗编辑
- [ ] 集数新增/编辑表单
- [ ] 播放可用性检查工具 (authorize)
- [ ] 学习时长查询工具 (summary)
- [ ] 基础表单校验与错误提示

### WordPress 插件
- [ ] 插件设置页: Base URL + shared_secret
- [ ] 文章自定义字段: hlsmith_collection_id
- [ ] WP REST API: GET /collections
- [ ] WP REST API: GET /collections/:id
- [ ] WP REST API: POST /authorize (校验登录 + 已购)
- [ ] WP REST API: POST /heartbeat
- [ ] 前端 JS: 列表渲染 + authorize + 播放 + heartbeat
- [ ] 小程序适配: 请求层适配, 复用通用逻辑
- [ ] 文章页面接入: 插入播放器与播放列表容器
- [ ] 迁移策略落地: 新课程先用新流程

## 里程碑与验收清单

### 里程碑 1: HLSmith 基础能力完成
- [x] 数据模型创建完成
- [x] viewer_key 验签与可播时间窗生效
- [x] authorize/stream/heartbeat/summary 跑通
- [x] 错误码与返回结构统一

### 里程碑 1.5: HLSmith 管理后台前端完成
- [ ] 合集管理全流程可用 (增删改查)
- [ ] 集数管理与上下架时间窗可配置
- [ ] 授权可播检查工具可用
- [ ] 学习时长查询工具可用

### 里程碑 2: WordPress 中转与页面接入完成
- [ ] 插件配置可保存 Base URL 与 shared_secret
- [ ] 文章绑定 collection_id 生效
- [ ] WP REST API 中转可用 (collections/authorize/heartbeat)
- [ ] 文章页播放列表与播放流程跑通

### 里程碑 3: 小程序接入完成
- [ ] 复用 WP API 调通授权与心跳
- [ ] 播放列表与播放流程可用
