# 安全说明

## 当前架构（2026-08 迁移后）

安全面从「Strapi 平台 + 自研层」收敛为「全自研 Worker」，Strapi 链依赖（axios/ajv 补丁、admin 面板暴露面、poweredBy 指纹）已随退役消失。

## 已落实的控制

| 控制点 | 实现 |
|--------|------|
| 认证 | users 表 + PBKDF2-SHA256（210k 迭代，WebCrypto）；会话 D1 查表即时吊销 |
| 会话 cookie | httpOnly + Secure(生产) + SameSite=Strict，8h TTL |
| 面板鉴权 | 全部 /panel 写路由 fail-closed 会话校验 + 角色白名单 |
| 登录限流 | CF-Connecting-IP（边缘受信头），D1 计数，10min/30 次 |
| 输入校验 | 集合白名单 + 字段白名单双重收口，未登记字段 400 拒绝 |
| 上传 | 魔数嗅探（jpeg/png/webp/gif），SVG 禁用，4/8/12MB 分级限额 |
| CSV 导出 | `= + - @` 开头单元格 `'` 前缀中和 |
| 富文本 | 前端 DOMPurify 白名单消毒（继承保留） |
| 外链 | http(s) scheme 白名单（入库与渲染双层） |
| 审计 | 全部写操作落 admin_audit_logs，导出支持分页过滤 |
| 启动断言 | 密钥缺失/占位直接抛错（继承 fail-fast 精神） |

## 已知残留（低风险，接受）

- 前端 CSP 仍含 unsafe-inline/unsafe-eval（OpenNext 迁移后由自持中间件做 nonce 收紧，见计划书 S3）
- image-proxy 白名单域名未限端口（B站 CDN 固定域，攻击面极窄）

## 依赖审计

Strapi 链 advisory 随退役消失；`pnpm audit` 常规跑即可，无需 allowlist 脚本。
