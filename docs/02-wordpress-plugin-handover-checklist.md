# HLSmith × WordPress 插件对接交接清单

> 目标：让接手同学无需额外口头补充即可完成 WordPress 插件对接开发、联调与验收。

## 1. 交接给对方的文档与位置
- 需求/接口设计与流程：`/Users/ihunterdev/Code/HLSmith/docs/01-hlsmith-wordpress-integration.md`
- 项目概览与启动方式：`/Users/ihunterdev/Code/HLSmith/README.md`、`/Users/ihunterdev/Code/HLSmith/README_CN.md`
- 部署与环境说明：`/Users/ihunterdev/Code/HLSmith/DEPLOYMENT.md`、`/Users/ihunterdev/Code/HLSmith/DEPLOYMENT_CN.md`
- 必要环境变量清单：`/Users/ihunterdev/Code/HLSmith/AGENTS.md`

## 2. 对接目标与关键结论
- WordPress 不接入 HLSmith 用户体系，仅生成 `viewer_key` 作为观看与学习统计凭证。
- WordPress 插件充当中转层，不直接暴露 HLSmith API 给前端或小程序。
- 动态 HLS URL 有效期 24h，不绑定用户；`viewer_key` 24h 有效，用于学习时长统计。
- 文章=合集：WordPress 文章通过自定义字段 `hlsmith_collection_id` 绑定 HLSmith collection。

## 3. HLSmith 已提供的能力（对接依赖）
> 详见 `docs/01-hlsmith-wordpress-integration.md`

- 集合与列表：
  - `GET /api/collections`
  - `GET /api/collections/:id`
- 播放授权与动态 HLS：
  - `POST /api/playback/authorize`
  - `GET /api/playback/stream/:token`
- 学习时长：
  - `POST /api/watch/heartbeat`
  - `GET /api/watch/summary`
- 规则与错误码：
  - 时间窗上下架判定
  - `INVALID_VIEWER_KEY / NOT_AVAILABLE_YET / EXPIRED`

## 4. WordPress 插件需实现的功能清单
> 命名空间示例：`/wp-json/hlsmith/v1`

### 4.1 插件设置页
- 可配置：
  - `HLSmith Base URL`
  - `shared_secret`
- 存储位置：WP Options（自定义 option key）

### 4.2 文章字段
- 文章自定义字段：`hlsmith_collection_id`
- 用途：绑定 HLSmith 的 `collection_id`

### 4.3 WordPress REST API 中转
- `GET /collections`
  - 透传 HLSmith `GET /api/collections`
- `GET /collections/:id`
  - 透传 HLSmith `GET /api/collections/:id`
- `POST /authorize`
  - 二次校验：必须登录 + 已购课程
  - 透传 HLSmith `POST /api/playback/authorize`
- `POST /heartbeat`
  - 透传 HLSmith `POST /api/watch/heartbeat`

### 4.4 前端 JS（文章页）
- 自动渲染播放列表
- 播放流程：
  - collections/:id -> authorize -> stream
- 心跳上报：
  - 每 15s `POST /heartbeat`

### 4.5 小程序适配
- 复用 WP 中转 API
- 统一请求适配层

## 5. viewer_key 生成规则（WP 插件服务端）
- 建议格式：
  - `viewer_key = base64(userId.issuedAt.ttl.signature)`
  - `signature = HMAC_SHA256(userId|issuedAt|ttl, shared_secret)`
- HLSmith 校验：
  - HMAC 正确
  - `issuedAt + ttl` 未过期
- `shared_secret` 仅存于 WP 服务端，小程序/前端只拿 `viewer_key`

## 6. 播放与统计流程（联调顺序）
1. `GET /collections`
2. `GET /collections/:id`（展示可播时间）
3. `POST /authorize`（合法+可播 -> 返回 token + playback_url）
4. 使用 `playback_url` 播放
5. 心跳：每 15s `POST /heartbeat`

## 7. 心跳规则（需严格遵守）
- 心跳间隔 ≥ 15s
- `delta_seconds` 上限 20
- `timestamp` 与服务器时间偏差 ≤ 2 分钟

## 8. 错误处理约定
- 不可播放：`playable=false` + 返回可播放时间
- viewer_key 过期/非法：`401 INVALID_VIEWER_KEY`
- 未到播放时间：`403 NOT_AVAILABLE_YET`
- 已过下架时间：`403 EXPIRED`

## 9. 时区与时间格式
- 数据库存 UTC
- API 返回 ISO 8601（含 Z）

## 10. 迁移注意事项
- 旧模式：文章内手动插入多条 HLS 链接
- 新模式：文章只绑定 `collection_id`，列表与播放地址动态获取
- 新旧模式可短期并存，逐课程迁移

## 11. 验收清单（交付前自测）
- [ ] 插件设置页可保存 Base URL + shared_secret
- [ ] 文章绑定 collection_id 生效
- [ ] `/collections`、`/collections/:id` 正常返回
- [ ] `/authorize` 正确校验登录 + 已购，并能返回可播 token + playback_url
- [ ] `/heartbeat` 心跳成功累计时长
- [ ] 文章页播放与心跳完整跑通
- [ ] 小程序端可通过 WP API 播放并上报
