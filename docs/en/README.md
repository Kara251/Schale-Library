# Schale Library

**This project was developed with Claude, ChatGPT, Gemini, and other AI tools.**

[简体中文](../zh-Hans/README.md) | [日本語](../ja/README.md)

## Overview

Schale Library is a system for collecting and organizing content related to *Blue Archive*, including external works, events, and reference materials.

Library URL: [https://bakivo.com](https://bakivo.com)

## Tech Stack

- **Full-stack framework:** [React](https://github.com/facebook/react) + [Next.js](https://github.com/vercel/next.js) App Router + [TypeScript](https://github.com/microsoft/TypeScript)
- **Styling:** [Shadcn/UI](https://github.com/shadcn-ui/ui) + [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)
- **Backend:** [Hono](https://github.com/honojs/hono) on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Data processing:** Next.js Route Handlers
- **Object storage:** Cloudflare R2
- **Drive:** [OpenList](https://github.com/OpenListTeam/OpenList) + OneDrive

## Local Development

- This project uses a pnpm workspace and does not require Docker.
- Install dependencies: `pnpm install`
- Start the backend (local Workers): `pnpm dev:server`
- Start the frontend: `pnpm dev:frontend`
- Backend tests: `pnpm test:server`
- The admin panel is available at `/{locale}/manage`. It uses same-origin Next.js Route Handlers and HttpOnly cookie sessions to access the backend, and covers content maintenance, user management, uploads, and audit logs.

## Deployment

Deployment, database, and maintainer account recovery notes are available in [Deployment Notes](deployment.md).

Security compensating controls and dependency audit notes are available in [Security Notes](security.md).

Database index notes are available in [Database Indexes](database-indexes.md).

## Copyright

- **Code:** Source code in this repository is licensed under the [MIT License](../../LICENSE).
- **Assets:** All original or officially derived game assets used in this project, including but not limited to character artwork, icons, voice, text, and UI design, belong to **Nexon Games**, **Yostar**, and related rights holders. This project respects the official fan content guidelines.
- **Non-commercial statement:** This is a non-commercial fan project for organizing and displaying related content. If a rights holder requests removal, the project will comply.
- **Fonts:** BlueakaBeta2GBK is from [Kivotos Library](https://kivo.wiki), and Noto Sans JP is from [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP).
