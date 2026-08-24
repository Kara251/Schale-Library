# 安全说明

## 当前架构（2026-08 迁移后）

安全面从「Strapi 平台 + 自研层」收敛为「全自研 Worker」，Strapi 链依赖（axios/ajv 补丁、admin 面板暴露面、poweredBy 指纹）已随退役消失。

## 已落实的控制

| 控制点 | 实现 |
|--------|------|
| 认证 | users 表 + PBKDF2-SHA256（100k 迭代，WebCrypto —— 100000 是 Workers 的迭代上限，超过抛 NotSupportedError）；会话 D1 查表即时吊销 |
| 会话 cookie | httpOnly + Secure(生产) + SameSite=Strict，8h TTL |
| 会话存储 | sessions 表主键存 token 的 SHA-256 摘要，不存 token 本身；数据库内容泄露不可用于冒充 |
| 会话传输 | Authorization: Bearer 优先，回退 cookie；同一个不透明 token |
| 面板鉴权 | 全部 /panel 写路由 fail-closed 会话校验 + 角色白名单 |
| 角色分层 | maintainer 只能管内容与自己的账号；用户管理仅 admin（服务端强制，不依赖前端隐藏入口） |
| 用户口令 | 下限 12 位；改自己的密码必须提供原密码，成功后吊销其余会话；管理员重置他人密码则吊销对方全部会话 |
| 防自锁 | 不能封禁/降级/删除自己；不能移除最后一个未封禁的 admin |
| 用户数据 | password_hash 不出现在任何面板响应里 |
| 登录限流 | CF-Connecting-IP（边缘受信头），D1 计数，10min/30 次 |
| 输入校验 | 集合白名单 + 字段白名单双重收口，未登记字段 400 拒绝 |
| 上传 | 魔数嗅探（jpeg/png/webp/gif），SVG 禁用，4/8/12MB 分级限额 |
| CSV 导出 | `= + - @` 开头单元格 `'` 前缀中和 |
| 富文本 | 前端 sanitize-html 白名单消毒（htmlparser2，不依赖 DOM）。**不要换回 DOMPurify** —— 它在不受支持的环境里静默原样返回输入，Workers 上没有可用的 DOM 实现 |
| 排序参数 | ORDER BY 片段只认白名单自有属性（lib/sort.ts），无兜底透传；原型链属性不命中 |
| 媒体读取 | /media/<key> 只放行 panel/ 前缀与四种扩展名，桶内其他对象不可经公开路径取出 |
| 外链 | http(s) scheme 白名单（入库与渲染双层） |
| 审计 | 全部写操作落 admin_audit_logs，导出支持分页过滤 |
| 启动断言 | 密钥缺失/占位直接抛错（继承 fail-fast 精神） |

## 已知残留（低风险，接受）

- 前端 CSP 生产环境仍含 `unsafe-inline`（Next 会内联 bootstrap 脚本，移除需改用 nonce）。
  `unsafe-eval` 已只在开发环境保留。
- image-proxy 白名单域名未限端口（B站 CDN 固定域，攻击面极窄）
- 列表类查询（students/schools/friend_links/spoiler_tiers/research_*）无覆盖索引。
  documentId 与 slug 有 UNIQUE 自动索引，详情查询已覆盖；列表在当前数据量（几百到几千行）
  下全表扫描成本可忽略。**触发点**：单表超过约 1 万行，或 D1 的 rows_read 明显上升时再加。

## 依赖审计

Strapi 链 advisory 随退役消失；`pnpm audit` 常规跑即可，无需 allowlist 脚本。
