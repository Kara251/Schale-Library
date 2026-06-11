# 2026-06 改进计划：考据知识系统 + 数据后台化 + 技术债务清理

> 工作分支：`claude/project-research-tech-debt-ld3c7y`
> 本文档是执行计划，按阶段推进，每阶段独立提交、可独立运行。

## 总目标

1. **数据后台化**：学院等基础数据从前端硬编码枚举迁移为 Strapi 可维护内容，编辑者可随时在后台增改。
2. **考据档案 → 发散性知识系统**：反向链接、考据对象（实体枢纽）、语义化关系、剧透分级、多阅读路径、修订记录、wiki 式链接、关系图谱。
3. **技术债务与 Bug 全量修复**：高/中严重度 bug 全部修复，主要技术债清理。

社区投稿不在范围内：自研后台仅供编辑者使用，公众只读。

---

## 阶段一：Bug 修复（高严重度）

| # | 问题 | 修复方案 |
|---|------|----------|
| 1 | 作品页忽略 URL 参数、硬上限 100 条、学生筛选只有前 50 人、e2e 测试必挂 | 保留现有筛选项 UI，恢复 URL 驱动的服务端筛选与分页（与 online-events 页一致）；学生筛选列表全量分页拉取 |
| 2 | `getResearchCurator` / `getCuratorAdmin` 的 try/catch 未 await，兜底失效 | 补 `await` |
| 3 | B 站同步重复导入竞态：手动 syncAll / 重试队列不取 job lock，查重与创建非原子 | 手动同步与重试队列复用同一 job lock；创建前二次查重 |
| 4 | 自研后台列表行与计数来自两套引擎（entityService vs documents），分页错乱 | 行与计数统一用 documents API，状态用 status 参数而非裸 publishedAt 过滤 |
| 5 | 全局搜索泄漏已停用公告 | `searchAnnouncements` 补 `isActive` 过滤 |

## 阶段二：Bug 修复（中严重度）

| # | 问题 | 修复方案 |
|---|------|----------|
| 6 | 合并活动列表跨页丢/重项 | 全量分页拉取两个集合后统一排序切片（活动量级小，安全） |
| 7 | 公告页静默截断 25 条 | 显式分页参数 + 页码 UI |
| 8 | `syncCount` 读改写竞态 | 写前重读 + 以 DB 原子方式累加 |
| 9 | 登录接口收到 JSON `null` 返回 500 | 类型守卫，返回 400 |
| 10 | 同步有错仍记 success；批量操作审计一律记 update | 引入 partial 状态；按操作记录 publish/unpublish |
| 11 | 生产环境 RSS 同步先探测 localhost；rssCache 无上限 | 生产环境仅在显式配置时使用本地实例；缓存加大小上限 |
| 12 | 限流信任可伪造的 `x-forwarded-for` 首跳 | 统一取 XFF 最后一跳（最近可信代理写入），三处共用工具函数 |
| 13 | CSV 导出无公式注入防护 | 前缀中和 `= + - @` 开头单元格 |
| 14 | 三份学校名映射不一致；考据后台下拉仅中文；页脚硬编码 2025 | 学校名统一为单一来源（见阶段四）；下拉选项三语化；年份动态 |
| 15 | 质量扫描非并发安全、逐行插入 | 扫描加 job lock，按扫描批次号清理旧数据 |

## 阶段三：技术债务清理

- 删除死代码：`extractTag`、`buildCollectionQuery` 重复分支、孤儿 `WorkListOptions` 字段。
- `NEXT_PUBLIC_API_URL` 等配置常量收敛到 `frontend/src/lib/config.ts`，9 处引用统一。
- 后台管理页骨架去重：14 个 `manage/*/page.tsx` 的三语 label 收敛进 `ADMIN_COLLECTION_META`。
- 后端 panel 控制器拆分：质量扫描、CSV 导出、限流提取为独立模块；`publishedAt` 强转 bug 修复（只接受布尔/null）。
- 详情/搜索接口 `populate: '*'` 替换为按需 populate。
- 前端包名 `my-v0-project` → `schale-library-frontend`。
- 修复/补充 e2e 测试：works 筛选（修复）、研究档案列表/详情/主题、公告分页。

## 阶段四：数据后台化（学院）

- 新增 `school` 集合类型：`name`(i18n)、`slug`、`short_name`(i18n)、`color`、`order`。
- `student` 新增 `school_ref` 关联（保留旧 `school` 枚举做兼容回退，避免破坏现有数据）。
- Strapi bootstrap 幂等种子：首次启动自动创建 13 所学院并按枚举回填 `school_ref`。
- 前端学生/作品/考据的学院筛选与展示改为从 API 读取学院列表，旧枚举仅作回退；三份硬编码学校名映射删除。
- 自研后台支持学院 CRUD。

## 阶段五：考据知识系统

按依赖顺序实现：

1. **反向链接（backlinks）**
   - 条目详情页自动展示「引用了本条的条目」（related_links 反查 + wiki 链接反查）。
   - 引用源维度：「此出处还支撑了哪些条目」，在条目详情的引用卡片上展示。
2. **考据对象 `research-subject`（实体枢纽）**
   - 字段：`name`(i18n)、`slug`、`subject_type`(school/organization/concept/character/location/item)、`description`(i18n)、`cover`、关联 `students`(M2M)、关联 `entries`(M2M)。
   - 公开枢纽页 `/research-archives/subjects/[slug]`：聚合相关条目、相关学生、简介。
   - 学生详情页展示相关考据条目（通过 subject 反查）。
   - 旧 `affiliations` JSON 保留作回退展示。
3. **语义化关系**
   - `research.related-link` 组件新增 `relation_type` 枚举：`prototype`(原型于)/`echoes`(呼应)/`extends`(补充)/`contradicts`(反驳)/`prerequisite`(前置阅读)/`related`(相关，默认)。
   - 详情页按关系类型分组渲染，反向链接同样标注类型。
4. **剧透分级**
   - `research-entry` 新增 `spoiler_scope` 枚举（none/vol1/vol2/vol3/vol4/vol5/final/latest，对应主线各篇章）。
   - 读者在档案页设置「阅读进度」（localStorage），超进度条目卡片模糊化 + 明示剧透范围，点击确认后可阅读；详情页顶部剧透警示条。
5. **多阅读路径**
   - 新增 `research-path` 集合：`title`(i18n)、`slug`、`description`(i18n)、`steps`(复用 path-step 组件)、`difficulty`。
   - curator 单例保留精选条目；推荐路径改为引用 path 集合。
   - 路径列表与路径详情页（步骤进度式 UI），条目详情页显示「所属路径中的上一篇/下一篇」。
6. **修订记录**
   - 新组件 `research.revision`：`date`、`note`(string)、`revision_type`(created/updated/confirmed/refuted)。
   - 条目可挂多条，详情页时间线渲染——考据被新剧情证实/推翻是核心叙事。
7. **Wiki 式链接**
   - 正文 richtext 中 `[[slug]]` / `[[slug|显示文字]]` 渲染期解析为站内链接（带悬浮预览卡）。
   - 反向链接计算同时覆盖 wiki 链接（body `$contains` 查询）。
8. **关系图谱**
   - `/research-archives/graph` 页面：条目/主题/对象三类节点，related_links + 主题边 + 对象边。
   - 轻量自实现力导向布局（Canvas，无重依赖），节点点击跳转、按类型着色、支持拖拽与缩放。

UI 原则：与现有 shadcn/ui 风格一致，过渡动画用 CSS transition；卡片、徽章、时间线组件复用现有设计语言；移动端可用。

## 阶段六：验收

- `tsc --noEmit` 前后端零错误；ESLint 零错误。
- e2e 全部通过（含修复与新增用例）。
- 计划文档勾选完成项，提交并推送。

## 提交策略

每阶段一个或多个提交，信息格式：`阶段意图: 具体内容`。全部推送到 `claude/project-research-tech-debt-ld3c7y`。
