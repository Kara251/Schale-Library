<h1 align="center">Schale Library - 夏莱图书馆</h1>
<p align="center">Build by Kara251</p>

- **简体中文** | [English](README_en.md)

### 项目简介

- 收集游戏作品 *《蔚蓝档案》* 内容，以及游戏外的各种作品、活动等的系统。

- >图书馆URL：[https://bakivo.com](https://bakivo.com)

### 技术栈

- **全栈框架:** [React](https://github.com/facebook/react) + [Next.js](https://github.com/vercel/next.js) (App Router) + [TypeScript](https://github.com/microsoft/TypeScript)
- **样式:** [Shadcn/UI](https://github.com/shadcn-ui/ui) + [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)
- **CMS:** [Strapi](https://github.com/strapi/strapi)
- **API通信:** Strapi REST API
- **数据处理:** Next.js Route Handlers（API Routes）
- **媒体数据:** [Cloudinary](https://cloudinary.com) + [OpenList](https://github.com/OpenListTeam/OpenList) + OneDrive

### 本地开发

- 本项目使用 pnpm workspace，不需要 Docker。
- 安装依赖：`pnpm install`
- 启动 Strapi：`pnpm dev:backend`
- 启动前端：`pnpm dev:frontend`
- B 站 RSS 同步默认优先读取本地 RSSHub：`http://localhost:1200`。如果需要本地 RSSHub，可在 `RSSHub/` 目录按 RSSHub 官方方式安装并启动，然后在 `backend/.env` 中保留 `RSSHUB_URL=http://localhost:1200`。
- 自研后台位于 `/{locale}/manage`，通过同源 Next.js Route Handlers 与 HttpOnly Cookie 会话访问 Strapi，包含内容维护、B 站订阅同步、上传与同步日志查看。

### 版权声明

- **代码版权**: 本项目仓库内的源代码遵循 [MIT License](./LICENSE) 开源协议。
- **素材版权**: 本项目中使用的所有游戏原始或官方衍生素材（包括但不限于角色立绘、图标、语音、文本、UI设计等）的知识产权均归属于 **Nexon Games**, **Yostar** 及相关版权方所有。本项目尊重 [《<蔚蓝档案>同人创作指引》](https://weibo.com/ttarticle/p/show?id=2309404965471018418185) 和 [『二次創作ガイドライン』](https://bluearchive.jp/fankit/guidelines) 。
- **非盈利声明**: 本项目为粉丝自制的非盈利性二创项目，旨在整理和展示游戏相关内容，不用于任何商业用途。如果版权方要求下架，本项目将无条件配合。
- **字体**: BlueakaBeta2GBK（中英文）来自 [基沃托斯古书馆](https://kivo.wiki)，Noto Sans JP（日文）来自 [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP)。
